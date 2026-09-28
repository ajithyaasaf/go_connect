import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import { Client } from '../services/schema';

interface ClientState {
    clients: Client[];
    updatedAt: string;
    setClients: (clients: Client[]) => void;
    addClient: (client: Client) => void;
    updateClient: (id: string, updates: Partial<Client>) => void;
    removeClient: (id: string) => void;
}

export const useClientStore = create<ClientState>()(
    persist(
        (set) => ({
            clients: [],
            updatedAt: new Date().toISOString(),
            setClients: (clients) =>
                set({ clients, updatedAt: new Date().toISOString() }),
            addClient: (client) =>
                set((state) => ({
                    clients: [...state.clients, client],
                    updatedAt: new Date().toISOString(),
                })),
            updateClient: (id, updates) =>
                set((state) => ({
                    clients: state.clients.map((c) =>
                        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
                    ),
                    updatedAt: new Date().toISOString(),
                })),
            removeClient: (id) =>
                set((state) => ({
                    clients: state.clients.filter((c) => c.id !== id),
                    updatedAt: new Date().toISOString(),
                })),
        }),
        {
            name: 'client-storage',
            storage: createJSONStorage(() => zustandStorage),
        }
    )
);
