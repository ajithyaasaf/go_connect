import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import firestore from '@react-native-firebase/firestore';

export interface RemoteAnnouncement {
    active: boolean;
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'alert';
}

export interface RemoteConfigState {
    // Dynamic Business Lists
    purposes: string[];
    actions: string[];
    workingHoursStart: string;
    workingHoursEnd: string;

    // Feature Flags
    enableVoiceNotes: boolean;
    enableAdvancedSearch: boolean;
    enableOtaAutoCheck: boolean;

    // Dynamic Announcements
    announcement: RemoteAnnouncement | null;

    // Maintenance Mode
    isMaintenance: boolean;
    maintenanceMessage: string;

    lastSyncedAt: string | null;

    // Actions
    setConfig: (config: Partial<RemoteConfigState>) => void;
}

const DEFAULT_CONFIG: Omit<RemoteConfigState, 'setConfig'> = {
    purposes: ['Sales', 'Follow-up', 'Review', 'General'],
    actions: ['Call', 'Visit', 'Email'],
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
    enableVoiceNotes: false,
    enableAdvancedSearch: true,
    enableOtaAutoCheck: true,
    announcement: null,
    isMaintenance: false,
    maintenanceMessage: 'GoConnect is currently undergoing scheduled maintenance. Please check back shortly.',
    lastSyncedAt: null,
};

export const useRemoteConfigStore = create<RemoteConfigState>()(
    persist(
        (set) => ({
            ...DEFAULT_CONFIG,
            setConfig: (config) => set((state) => ({ ...state, ...config })),
        }),
        {
            name: 'goconnect-remote-config',
            storage: createJSONStorage(() => zustandStorage),
        }
    )
);

class RemoteConfigService {
    private unsubscribe: (() => void) | null = null;

    initialize(): void {
        try {
            console.log('[RemoteConfig] Initializing real-time remote configuration...');
            this.unsubscribe = firestore()
                .collection('app_config')
                .doc('global')
                .onSnapshot(
                    (doc) => {
                        const data = doc?.data();
                        if (data) {
                            useRemoteConfigStore.getState().setConfig({
                                purposes: data.purposes || DEFAULT_CONFIG.purposes,
                                actions: data.actions || DEFAULT_CONFIG.actions,
                                workingHoursStart: data.workingHoursStart || DEFAULT_CONFIG.workingHoursStart,
                                workingHoursEnd: data.workingHoursEnd || DEFAULT_CONFIG.workingHoursEnd,
                                enableVoiceNotes: data.enableVoiceNotes ?? DEFAULT_CONFIG.enableVoiceNotes,
                                enableAdvancedSearch: data.enableAdvancedSearch ?? DEFAULT_CONFIG.enableAdvancedSearch,
                                enableOtaAutoCheck: data.enableOtaAutoCheck ?? DEFAULT_CONFIG.enableOtaAutoCheck,
                                announcement: data.announcement || null,
                                isMaintenance: data.isMaintenance ?? false,
                                maintenanceMessage: data.maintenanceMessage || DEFAULT_CONFIG.maintenanceMessage,
                                lastSyncedAt: new Date().toISOString(),
                            });
                            console.log('[RemoteConfig] Synced remote configuration from Firestore.');
                        }
                    },
                    (error) => {
                        console.warn('[RemoteConfig] Listener warning (using cached defaults):', error.message);
                    }
                );
        } catch (e) {
            console.warn('[RemoteConfig] Failed to attach listener:', e);
        }
    }

    destroy(): void {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
}

export const remoteConfigService = new RemoteConfigService();
