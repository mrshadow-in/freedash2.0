import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdState {
    isDebugMode: boolean;
    toggleDebugMode: () => void;
    setDebugMode: (value: boolean) => void;

    isVisualMode: boolean;
    activeSelector: string | null;
    isAdModalOpen: boolean;

    setVisualMode: (value: boolean) => void;
    setActiveSelector: (selector: string | null) => void;
    setAdModalOpen: (value: boolean) => void;
}

export const useAdStore = create<AdState>()(
    persist(
        (set) => ({
            isDebugMode: false,
            isVisualMode: false,
            activeSelector: null,
            isAdModalOpen: false,

            toggleDebugMode: () => set((state) => ({ isDebugMode: !state.isDebugMode })),
            setDebugMode: (value: boolean) => set({ isDebugMode: value }),

            setVisualMode: (value: boolean) => set({ isVisualMode: value }),
            setActiveSelector: (selector: string | null) => set({ activeSelector: selector }),
            setAdModalOpen: (value: boolean) => set({ isAdModalOpen: value }),
        }),
        {
            name: 'ad_debug_mode', // unique name for localStorage key
        }
    )
);
