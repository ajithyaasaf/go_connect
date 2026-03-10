import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import { OfflineAction } from './types';

interface OfflineState {
    queue: OfflineAction[];
    isSyncing: boolean;
    addToQueue: (action: OfflineAction) => void;
    removeFromQueue: (id: string) => void;
    setSyncing: (isSyncing: boolean) => void;
    clearQueue: () => void;
}

export const useOfflineStore = create<OfflineState>()(
    persist(
        (set) => ({
            queue: [],
            isSyncing: false,
            addToQueue: (action) =>
                set((state) => ({ queue: [...state.queue, action] })),
            removeFromQueue: (id) =>
                set((state) => ({
                    queue: state.queue.filter((item) => item.id !== id),
                })),
            setSyncing: (isSyncing) => set({ isSyncing }),
            clearQueue: () => set({ queue: [] }),
        }),
        {
            name: 'offline-queue-storage',
            storage: createJSONStorage(() => zustandStorage),
        }
    )
);
