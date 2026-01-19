"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueRequest = queueRequest;
exports.getQueueStats = getQueueStats;
exports.queuedAxiosRequest = queuedAxiosRequest;
const p_queue_1 = __importDefault(require("p-queue"));
const axios_1 = __importDefault(require("axios"));
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
const queue = new p_queue_1.default({
    concurrency: 5, // Max 5 concurrent Pterodactyl API requests
    timeout: 15000, // 15s timeout per request
    throwOnTimeout: true, // Fail fast on timeout
    autoStart: true
});
const circuitBreakers = new Map();
const CIRCUIT_BREAKER_THRESHOLD = 5; // Open after 5 failures
const CIRCUIT_BREAKER_TIMEOUT = 60000; // Wait 60s before retry
/**
 * Check if circuit breaker is open for endpoint
 */
function isCircuitOpen(endpoint) {
    const state = circuitBreakers.get(endpoint);
    if (!state || !state.isOpen)
        return false;
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
function recordSuccess(endpoint) {
    const state = circuitBreakers.get(endpoint);
    if (state) {
        state.failures = 0;
        state.isOpen = false;
    }
}
/**
 * Record failure for endpoint
 */
function recordFailure(endpoint) {
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
async function executeWithRetry(endpoint, requestFn, maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await requestFn();
            recordSuccess(endpoint);
            return result;
        }
        catch (error) {
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
async function queueRequest(endpoint, requestFn, options = {}) {
    // Check circuit breaker
    if (isCircuitOpen(endpoint)) {
        throw new Error(`Circuit breaker is OPEN for ${endpoint}. Try again later.`);
    }
    const { maxRetries = 3, timeout = 15000 } = options;
    // Add to queue
    return queue.add(async () => executeWithRetry(endpoint, requestFn, maxRetries), { throwOnTimeout: true });
}
/**
 * Get queue statistics
 */
function getQueueStats() {
    return {
        size: queue.size,
        pending: queue.pending,
        isPaused: queue.isPaused
    };
}
/**
 * Axios wrapper with timeout
 */
async function queuedAxiosRequest(endpoint, config) {
    return queueRequest(endpoint, async () => {
        const response = await (0, axios_1.default)({
            ...config,
            timeout: config.timeout || 15000
        });
        return response.data;
    });
}
exports.default = queue;
