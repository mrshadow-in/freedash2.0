import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL,
    timeout: 15000, // 15 seconds timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { logout } = useAuthStore.getState();

        console.error('[API Error]', {
            message: error.message,
            url: error.config?.url,
            status: error.response?.status,
            data: error.response?.data
        });

        if (error.code === 'ECONNABORTED') {
            toast.error('Connection timeout. Please check your internet.');
        } else if (!error.response) {
            toast.error('Network error. Backend might be offline.');
        } else if (error.response?.status === 401 || error.response?.status === 403) {
            // Only toast if not already on login page
            if (!window.location.pathname.includes('/login')) {
                toast.error('Session expired. Please login again.');
            }
            logout(); // Clear state and trigger redirect
        }

        return Promise.reject(error);
    }
);

export default api;
