import PQueue from 'p-queue';
import axios from 'axios';

/**
 * Request Queue with Throttling and Retry Logic
 * 
 * Prevents API overload by:
 * - Limiting concurrent requests to 5
 * - Adding timeout (15s default)
 * - Retry with exponential backoff
 * - Circuit breaker pattern
 */

// Queue configuration
const queue = new PQueue({
    concurrency: 5,        // Max 5 concurrent Pterodactyl API requests
    timeout: 15000,        // 15s timeout per request
    throwOnTimeout: true,  // Fail fast on timeout
    autoStart: true
});

// Circuit breaker state
interface CircuitBreakerState {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

const CIRCUIT_BREAKER_THRESHOLD = 5;  // Open after 5 failures
const CIRCUIT_BREAKER_TIMEOUT = 60000; // Wait 60s before retry

/**
 * Check if circuit breaker is open for endpoint
 */
function isCircuitOpen(endpoint: string): boolean {
    const state = circuitBreakers.get(endpoint);
    if (!state || !state.isOpen) return false;

    // Check if timeout has passed
    if (Date.now() - state.lastFailure > CIRCUIT_BREAKER_TIMEOUT) {
        state.isOpen = false;
        state.failures = 0;
        return false;
    }

    return true;
}

/**
 * Record success for endpoint
 */
function recordSuccess(endpoint: string): void {
    const state = circuitBreakers.get(endpoint);
    if (state) {
        state.failures = 0;
        state.isOpen = false;
    }
}

/**
 * Record failure for endpoint
 */
function recordFailure(endpoint: string): void {
    let state = circuitBreakers.get(endpoint);
    if (!state) {
        state = { failures: 0, lastFailure: 0, isOpen: false };
        circuitBreakers.set(endpoint, state);
    }

    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
        state.isOpen = true;
        console.warn(`[RequestQueue] Circuit breaker OPEN for ${endpoint} (${state.failures} failures)`);
    }
}

/**
 * Execute request with retry logic
 */
async function executeWithRetry<T>(
    endpoint: string,
    requestFn: () => Promise<T>,
    maxRetries: number = 3
): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await requestFn();
            recordSuccess(endpoint);
            return result;
        } catch (error: any) {
            lastError = error;

            // Don't retry on client errors (4xx)
            if (error.response?.status >= 400 && error.response?.status < 500) {
                throw error;
            }

            // Don't retry on last attempt
            if (attempt === maxRetries) {
                break;
            }

            // Exponential backoff: 1s, 2s, 4s...
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
            console.log(`[RequestQueue] Retry ${attempt}/${maxRetries} for ${endpoint} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    recordFailure(endpoint);
    throw lastError;
}

/**
 * Add request to queue with circuit breaker and retry
 */
export async function queueRequest<T>(
    endpoint: string,
    requestFn: () => Promise<T>,
    options: {
        maxRetries?: number;
        timeout?: number;
    } = {}
): Promise<T> {
    // Check circuit breaker
    if (isCircuitOpen(endpoint)) {
        throw new Error(`Circuit breaker is OPEN for ${endpoint}. Try again later.`);
    }

    const { maxRetries = 3, timeout = 15000 } = options;

    // Add to queue
    return queue.add(
        async () => executeWithRetry(endpoint, requestFn, maxRetries),
        { throwOnTimeout: true }
    );
}

/**
 * Get queue statistics
 */
export function getQueueStats() {
    return {
        size: queue.size,
        pending: queue.pending,
        isPaused: queue.isPaused
    };
}

/**
 * Axios wrapper with timeout
 */
export async function queuedAxiosRequest<T = any>(
    endpoint: string,
    config: any
): Promise<T> {
    return queueRequest(
        endpoint,
        async () => {
            const response = await axios({
                ...config,
                timeout: config.timeout || 15000
            });
            return response.data as T;
        }
    );
}

export default queue;
