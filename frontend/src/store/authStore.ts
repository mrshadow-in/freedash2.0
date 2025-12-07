import { create } from 'zustand';
import api from '../api/client';

interface User {
    id: string;
    username: string;
    email: string;
    coins: number;
    role: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, username: string, password: string) => Promise<void>;
    logout: () => void;
    setUser: (user: User) => void;
    isAuthenticated: boolean;
}

// Helper to get stored user
const getStoredUser = (): User | null => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
};

export const useAuthStore = create<AuthState>((set) => ({
    user: getStoredUser(),
    token: localStorage.getItem('accessToken'),
    isAuthenticated: !!localStorage.getItem('accessToken'),

    login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        const { accessToken, refreshToken, user } = res.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        set({ user, token: accessToken, isAuthenticated: true });
    },

    register: async (email, username, password) => {
        await api.post('/auth/register', { email, username, password });
    },

    setUser: (user) => {
        localStorage.setItem('user', JSON.stringify(user));
        set({ user });
    },

    logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false });
    },
}));
