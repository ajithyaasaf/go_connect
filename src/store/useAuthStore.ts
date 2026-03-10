import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import { UserProfile } from './types';

interface AuthState {
    user: UserProfile | null;
    isAuthenticated: boolean;
    _hasHydrated: boolean;
    hasOnboarded: boolean;
    setUser: (user: UserProfile | null) => void;
    logout: () => void;
    setHasHydrated: (value: boolean) => void;
    setHasOnboarded: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            _hasHydrated: false,
            hasOnboarded: false,
            setUser: (user) => set({ user, isAuthenticated: !!user }),
            logout: () => set({ user: null, isAuthenticated: false }),
            setHasHydrated: (value) => set({ _hasHydrated: value }),
            setHasOnboarded: (value) => set({ hasOnboarded: value }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => zustandStorage),
            partialize: (state) => ({
                // Only persist these fields
                user: state.user,
                isAuthenticated: state.isAuthenticated,
                hasOnboarded: state.hasOnboarded,
            }),
            onRehydrateStorage: () => {
                console.log('[Auth] ⚙️ onRehydrateStorage check');
                return (state, error) => {
                    if (error) {
                        console.error('[Auth] Hydration error:', error);
                    } else {
                        console.log('[Auth] Hydration complete. isAuthenticated:', state?.isAuthenticated);
                    }
                    useAuthStore.setState({ _hasHydrated: true });
                };
            },
        }
    )
);
