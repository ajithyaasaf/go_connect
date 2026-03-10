import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { authService } from '../services/auth';
import { AuthStack } from './AuthStack';
import { AppStack } from './AppStack';
import { useAuthStore } from '../store/useAuthStore';
import { NetworkMonitor } from '../services/network';
import { SyncService } from '../services/sync';
import { useNetworkStore } from '../services/network';
import { OnboardingScreen } from '../screens/OnboardingScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const hasHydrated = useAuthStore((s) => s._hasHydrated);
    const hasOnboarded = useAuthStore((s) => s.hasOnboarded);
    const isConnected = useNetworkStore((s) => s.isConnected);

    const [isFirebaseInitialized, setIsFirebaseInitialized] = React.useState(false);

    useEffect(() => {
        // Initialize Network Monitoring globally
        const unsubscribeNetwork = NetworkMonitor.initialize();

        // Check Firebase Auth Initial State
        const unsubscribeAuth = authService.subscribeToAuthStats((user) => {
            setIsFirebaseInitialized(true);
        });

        // Safety net: In case sync hydration somehow fails (rare), force it after brief moment
        const fallbackTimer = setTimeout(() => {
            if (!useAuthStore.getState()._hasHydrated) {
                console.log('[RootNav] Safety fallback triggered');
                useAuthStore.setState({ _hasHydrated: true });
            }
        }, 100);

        return () => {
            unsubscribeNetwork();
            clearTimeout(fallbackTimer);
        };
    }, []);

    // Separate effect: Only subscribe to Firebase auth AFTER hydration completes
    useEffect(() => {
        if (!hasHydrated) return; // Wait for hydration

        console.log('[RootNav] Subscribing to Firebase auth state...');
        const unsubscribeAuth = authService.subscribeToAuthStats();

        return () => {
            unsubscribeAuth();
        };
    }, [hasHydrated]);

    useEffect(() => {
        // Auto-sync when online
        if (isConnected) {
            SyncService.processQueue();
        }
    }, [isConnected]);

    console.log('[RootNav] Rendering Check:',
        'Auth:', isAuthenticated,
        'Hydrated:', hasHydrated,
        'FirebaseInit:', isFirebaseInitialized
    );

    // Unified Stack Navigator for Smooth Transitions
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#F8FAFC' } // Enforce solid background
            }}
        >
            {/* Native Splash handles loading state, go straight to content */}
            {isAuthenticated ? (
                /* Authenticated App Flow */
                <Stack.Screen
                    name="App"
                    component={AppStack}
                    options={{ animation: 'none' }} // Instant switch
                />
            ) : (
                /* Authentication Flow */
                <>
                    {!hasOnboarded && (
                        <Stack.Screen
                            name="Onboarding"
                            component={OnboardingScreen}
                            options={{ animation: 'fade' }}
                        />
                    )}
                    <Stack.Screen
                        name="Auth"
                        component={AuthStack}
                        options={{ animation: 'fade' }}
                    />
                </>
            )}
        </Stack.Navigator>
    );
};
