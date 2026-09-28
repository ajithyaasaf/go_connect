import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandStorage } from '../utils/storage';
import { v4 as uuidv4 } from 'uuid';
import { OtaState, OtaStatus, OtaChannel, OtaRelease, NativeBundleInfo, NativeAppVersionInfo } from './types';

export const useOtaStore = create<OtaState>()(
    persist(
        (set) => ({
            status: 'idle',
            appVersion: '1.0.0',
            buildNumber: 1,
            currentBundleVersion: 0,
            currentBundleHash: '',
            isOtaActive: false,
            channel: 'production',
            availableRelease: null,
            downloadProgress: 0,
            bytesDownloaded: 0,
            totalBytes: 0,
            isMandatory: false,
            lastChecked: null,
            error: null,
            installationId: uuidv4(),
            autoDownloadEnabled: true,
            isModalVisible: false,

            setStatus: (status: OtaStatus) => set({ status }),
            setChannel: (channel: OtaChannel) => set({ channel }),
            setAvailableRelease: (availableRelease: OtaRelease | null) =>
                set({
                    availableRelease,
                    isMandatory: availableRelease?.mandatory ?? false,
                    status: availableRelease ? 'available' : 'up_to_date',
                }),
            setDownloadProgress: (downloadProgress: number, bytesDownloaded: number, totalBytes: number) =>
                set({
                    downloadProgress,
                    bytesDownloaded,
                    totalBytes,
                    status: downloadProgress >= 100 ? 'ready' : 'downloading',
                }),
            setError: (error: string | null) =>
                set({ error, status: error ? 'error' : 'idle' }),
            setLastChecked: (lastChecked: string) => set({ lastChecked }),
            setModalVisible: (isModalVisible: boolean) => set({ isModalVisible }),
            setInstalledBundleInfo: (info: NativeBundleInfo) =>
                set({
                    isOtaActive: info.isOtaActive,
                    currentBundleVersion: info.bundleVersion,
                    currentBundleHash: info.bundleHash,
                }),
            setAppVersionInfo: (info: NativeAppVersionInfo) =>
                set({
                    appVersion: info.appVersion,
                    buildNumber: info.buildNumber,
                }),
        }),
        {
            name: 'goconnect-ota-store',
            storage: createJSONStorage(() => zustandStorage),
            partialize: (state) => ({
                channel: state.channel,
                currentBundleVersion: state.currentBundleVersion,
                currentBundleHash: state.currentBundleHash,
                lastChecked: state.lastChecked,
                installationId: state.installationId,
                autoDownloadEnabled: state.autoDownloadEnabled,
            }),
        }
    )
);
