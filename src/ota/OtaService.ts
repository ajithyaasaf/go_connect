import { NativeModules, NativeEventEmitter, Platform, Alert, AppState, AppStateStatus, Linking } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useOtaStore } from './useOtaStore';
import { OtaRelease, OtaChannel, OtaDownloadProgressEvent, NativeAppVersionInfo, NativeBundleInfo } from './types';

const { GoConnectOTA } = NativeModules;
const AUTO_CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes throttle

class OtaService {
    private eventEmitter: NativeEventEmitter | null = null;
    private progressSubscription: any = null;
    private appStateSubscription: any = null;
    private isInitialized = false;
    private lastAutoCheckTimestamp = 0;

    constructor() {
        if (GoConnectOTA) {
            this.eventEmitter = new NativeEventEmitter(GoConnectOTA);
        }
    }

    /**
     * Initializes the OTA subsystem on app startup.
     * 1. Marks current bundle healthy (cancelling safety rollback).
     * 2. Reads installed native and bundle version info.
     * 3. Sets up download progress listeners.
     * 4. Triggers background update check.
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;
        this.isInitialized = true;

        try {
            // 1. Sync Native Info
            await this.syncNativeInfo();

            // 2. Mark bundle as healthy
            if (GoConnectOTA?.markUpdateSuccess) {
                await GoConnectOTA.markUpdateSuccess();
                console.log('[OTA] Successfully marked bundle healthy.');
            }

            // 3. Register Event Listener
            if (this.eventEmitter) {
                this.progressSubscription = this.eventEmitter.addListener(
                    'onOtaDownloadProgress',
                    (event: OtaDownloadProgressEvent) => {
                        const percent = Math.round(event.progress * 100);
                        useOtaStore.getState().setDownloadProgress(
                            percent,
                            event.bytesDownloaded,
                            event.totalBytes
                        );
                    }
                );
            }

            // 4. Background update check on startup
            setTimeout(() => {
                this.lastAutoCheckTimestamp = Date.now();
                this.checkForUpdate(undefined, false).catch(err => {
                    console.warn('[OTA] Background update check failed:', err);
                });
            }, 3000); // 3 second delay after launch to avoid competing with initial layout

            // 5. Check for updates when app returns to foreground
            this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
                if (nextAppState === 'active') {
                    const now = Date.now();
                    if (now - this.lastAutoCheckTimestamp > AUTO_CHECK_INTERVAL_MS) {
                        this.lastAutoCheckTimestamp = now;
                        console.log('[OTA] App resumed to foreground, checking for updates...');
                        this.checkForUpdate(undefined, false).catch(err => {
                            console.warn('[OTA] Foreground update check failed:', err);
                        });
                    }
                }
            });
        } catch (error) {
            console.error('[OTA] Initialization error:', error);
        }
    }

    /**
     * Reads native app and active bundle information.
     */
    async syncNativeInfo(): Promise<void> {
        if (!GoConnectOTA) return;

        try {
            const appInfo: NativeAppVersionInfo = await GoConnectOTA.getAppVersion();
            const bundleInfo: NativeBundleInfo = await GoConnectOTA.getCurrentBundleInfo();

            useOtaStore.getState().setAppVersionInfo(appInfo);
            useOtaStore.getState().setInstalledBundleInfo(bundleInfo);

            console.log('[OTA] Native App Version:', appInfo.appVersion, 'Bundle Version:', bundleInfo.bundleVersion);
        } catch (e) {
            console.warn('[OTA] Could not read native bundle info:', e);
        }
    }

    /**
     * Checks for available OTA updates for the specified or active channel.
     */
    async checkForUpdate(channelOverride?: OtaChannel, isManual = false): Promise<OtaRelease | null> {
        const store = useOtaStore.getState();
        const targetChannel = channelOverride || store.channel;

        store.setStatus('checking');
        store.setError(null);

        try {
            console.log(`[OTA] Checking for updates on channel: ${targetChannel}...`);

            // Query Firestore collection `ota_releases` (index-free query)
            const snapshot = await firestore()
                .collection('ota_releases')
                .where('channel', '==', targetChannel)
                .get();

            store.setLastChecked(new Date().toISOString());

            const matchingReleases = snapshot.docs
                .map(doc => doc.data() as OtaRelease)
                .filter(release => release.enabled)
                .sort((a, b) => (b.bundleVersion || 0) - (a.bundleVersion || 0));

            if (matchingReleases.length === 0) {
                console.log('[OTA] No releases found for channel:', targetChannel);
                store.setAvailableRelease(null);
                store.setStatus('up_to_date');
                return null;
            }

            const releaseData = matchingReleases[0];

            // Check if newer than active bundle
            if (releaseData.bundleVersion <= store.currentBundleVersion) {
                console.log(`[OTA] Already running latest or newer bundle (installed: ${store.currentBundleVersion}, latest: ${releaseData.bundleVersion})`);
                store.setAvailableRelease(null);
                store.setStatus('up_to_date');
                return null;
            }

            // 1. Check native version compatibility
            if (releaseData.minNativeVersion && this.isNativeOutdated(store.appVersion, releaseData.minNativeVersion)) {
                console.warn(`[OTA] Update requires native APK ${releaseData.minNativeVersion}, but current is ${store.appVersion}. Skipping OTA.`);
                if (isManual || releaseData.mandatory) {
                    Alert.alert(
                        'App Update Required',
                        `This update contains core native changes that require a newer APK (v${releaseData.minNativeVersion} or higher).`,
                        releaseData.apkDownloadUrl ? [
                            { text: 'Later', style: 'cancel' },
                            {
                                text: 'Download APK',
                                onPress: () => {
                                    Linking.openURL(releaseData.apkDownloadUrl!).catch(err => {
                                        console.error('[OTA] Failed to open APK download URL:', err);
                                    });
                                }
                            }
                        ] : [{ text: 'OK' }]
                    );
                }
                store.setAvailableRelease(null);
                store.setStatus('up_to_date');
                return null;
            }

            // 2. Check Staged Rollout Percentage (Cohort bucketing)
            if (typeof releaseData.rolloutPercentage === 'number' && releaseData.rolloutPercentage < 100) {
                const userBucket = this.computeBucket(store.installationId || 'default');
                if (userBucket >= releaseData.rolloutPercentage) {
                    console.log(`[OTA] Device bucket (${userBucket}) is outside rollout window (${releaseData.rolloutPercentage}%). Skipping.`);
                    store.setAvailableRelease(null);
                    store.setStatus('up_to_date');
                    return null;
                }
            }

            console.log(`[OTA] Found newer bundle: v${releaseData.version} (Bundle #${releaseData.bundleVersion})`);
            store.setAvailableRelease(releaseData);

            if (releaseData.mandatory || isManual) {
                store.setModalVisible(true);
            } else if (store.autoDownloadEnabled) {
                // Silently download in background
                console.log('[OTA] Starting silent background download...');
                this.downloadAndStageUpdate(releaseData, false);
            }

            return releaseData;
        } catch (error: any) {
            console.error('[OTA] Error checking for updates:', error);
            // On automatic checks, don't show disruptive error status to user
            if (isManual) {
                store.setError(error?.message || 'Failed to check for updates');
                store.setStatus('error');
            } else {
                store.setStatus('idle');
            }
            return null;
        }
    }

    /**
     * Downloads and stages the OTA bundle.
     */
    async downloadAndStageUpdate(release: OtaRelease, promptOnComplete = true): Promise<boolean> {
        const store = useOtaStore.getState();

        if (!GoConnectOTA) {
            const err = 'OTA Native Module not available on this platform/build';
            store.setError(err);
            return false;
        }

        store.setStatus('downloading');
        store.setError(null);
        store.setDownloadProgress(0, 0, release.sizeBytes || 0);

        try {
            console.log(`[OTA] Downloading bundle #${release.bundleVersion} from ${release.bundleUrl}...`);

            const result = await GoConnectOTA.downloadBundle(
                release.bundleUrl,
                release.hash,
                release.bundleVersion,
                release.channel
            );

            console.log('[OTA] Download complete:', result);
            store.setDownloadProgress(100, release.sizeBytes, release.sizeBytes);
            store.setStatus('ready');

            if (promptOnComplete || release.mandatory) {
                store.setModalVisible(true);
            }

            return true;
        } catch (error: any) {
            console.error('[OTA] Download failed:', error);
            store.setError(error?.message || 'Download failed');
            store.setStatus('error');
            return false;
        }
    }

    /**
     * Promotes the staged bundle to active and restarts the React Native context.
     */
    async applyUpdateAndRestart(release?: OtaRelease): Promise<void> {
        const store = useOtaStore.getState();
        const targetRelease = release || store.availableRelease;

        if (!targetRelease || !GoConnectOTA) {
            console.error('[OTA] Cannot apply update: missing release or native module');
            return;
        }

        store.setStatus('idle');
        store.setModalVisible(false);

        try {
            console.log('[OTA] Applying staged bundle...');
            await GoConnectOTA.applyStagedBundle(
                targetRelease.bundleVersion,
                targetRelease.hash,
                targetRelease.channel
            );

            console.log('[OTA] Restarting application...');
            await GoConnectOTA.restartApp();
        } catch (error: any) {
            console.error('[OTA] Failed to apply and restart:', error);
            Alert.alert('Update Failed', error?.message || 'Could not apply update.');
        }
    }

    /**
     * Rolls back to base embedded APK bundle and restarts.
     */
    async rollbackToBase(): Promise<void> {
        if (!GoConnectOTA) return;

        try {
            console.log('[OTA] Rolling back to stock embedded bundle...');
            await GoConnectOTA.rollbackToBase();
        } catch (error) {
            console.error('[OTA] Rollback error:', error);
        }
    }

    /**
     * Compares semver native versions.
     */
    private isNativeOutdated(current: string, required: string): boolean {
        const currParts = current.split('.').map(n => parseInt(n, 10) || 0);
        const reqParts = required.split('.').map(n => parseInt(n, 10) || 0);

        for (let i = 0; i < Math.max(currParts.length, reqParts.length); i++) {
            const c = currParts[i] || 0;
            const r = reqParts[i] || 0;
            if (c < r) return true;
            if (c > r) return false;
        }
        return false;
    }

    /**
     * Computes a deterministic integer bucket (0 to 99) for staged rollouts based on installation ID.
     */
    private computeBucket(id: string): number {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = (hash << 5) - hash + id.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash) % 100;
    }

    /**
     * Cleans up subscriptions.
     */
    destroy(): void {
        if (this.progressSubscription) {
            this.progressSubscription.remove();
            this.progressSubscription = null;
        }
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
            this.appStateSubscription = null;
        }
    }
}

export const otaService = new OtaService();
