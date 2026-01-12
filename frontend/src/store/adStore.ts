import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdState {
    isDebugMode: boolean;
    toggleDebugMode: () => void;
    setDebugMode: (value: boolean) => void;
}

export const useAdStore = create<AdState>()(
    persist(
        (set) => ({
            isDebugMode: false,
            toggleDebugMode: () => set((state) => ({ isDebugMode: !state.isDebugMode })),
            setDebugMode: (value: boolean) => set({ isDebugMode: value }),
        }),
        {
            name: 'ad_debug_mode', // unique name for localStorage key
        }
    )
);
