import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';

/**
 * SessionHeartbeat
 * Periodically verifies the current session by calling /auth/me.
 * If the session is invalid, the global Axios interceptor will handle the logout.
 */
const SessionHeartbeat = () => {
    const { isAuthenticated, setUser } = useAuthStore();

    useEffect(() => {
        if (!isAuthenticated) return;

        // Perform initial check
        const checkSession = async () => {
            try {
                const res = await api.get('/auth/me');
                if (res.data) {
                    setUser(res.data);
                }
            } catch (error) {
                // Interceptor handles 401/403 redirects
                console.error('Session check failed:', error);
            }
        };

        checkSession();

        // Set up interval (every 3 minutes)
        const intervalId = setInterval(checkSession, 3 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, [isAuthenticated, setUser]);

    // This component renders nothing
    return null;
};

export default SessionHeartbeat;
