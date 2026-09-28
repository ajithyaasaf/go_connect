export type OtaChannel = 'production' | 'staging' | 'canary';

export type OtaStatus =
    | 'idle'
    | 'checking'
    | 'available'
    | 'downloading'
    | 'ready'
    | 'up_to_date'
    | 'error';

export interface OtaRelease {
    version: string;             // e.g. "1.0.1"
    bundleVersion: number;        // Incrementing integer e.g. 102
    minNativeVersion: string;     // Minimum native APK version required e.g. "1.0"
    channel: OtaChannel;
    bundleUrl: string;            // Direct HTTPS URL to index.android.bundle
    apkDownloadUrl?: string;      // Direct HTTPS URL or PlayStore link if native APK update required
    hash: string;                 // SHA-256 integrity checksum
    sizeBytes: number;
    mandatory: boolean;          // If true, user is prompted to restart immediately
    releaseNotes: string;        // Markdown or plain text changelog
    releasedAt: string;          // ISO timestamp
    rolloutPercentage: number;   // 1 to 100 for staged rollouts
    enabled: boolean;
}

export interface NativeBundleInfo {
    isOtaActive: boolean;
    bundleVersion: number;
    bundleHash: string;
    channel: string;
    installedAt: string;
}

export interface NativeAppVersionInfo {
    appVersion: string;
    buildNumber: number;
    osVersion: string;
    packageName: string;
}

export interface OtaDownloadProgressEvent {
    progress: number;            // 0.0 to 1.0
    bytesDownloaded: number;
    totalBytes: number;
    bundleVersion: number;
}

export interface OtaState {
    status: OtaStatus;
    appVersion: string;
    buildNumber: number;
    currentBundleVersion: number;
    currentBundleHash: string;
    isOtaActive: boolean;
    channel: OtaChannel;
    availableRelease: OtaRelease | null;
    downloadProgress: number;    // 0 to 100
    bytesDownloaded: number;
    totalBytes: number;
    isMandatory: boolean;
    lastChecked: string | null;
    error: string | null;
    installationId: string;
    autoDownloadEnabled: boolean;
    isModalVisible: boolean;

    // Actions
    setStatus: (status: OtaStatus) => void;
    setChannel: (channel: OtaChannel) => void;
    setAvailableRelease: (release: OtaRelease | null) => void;
    setDownloadProgress: (progress: number, bytesDownloaded: number, totalBytes: number) => void;
    setError: (error: string | null) => void;
    setLastChecked: (timestamp: string) => void;
    setModalVisible: (visible: boolean) => void;
    setInstalledBundleInfo: (info: NativeBundleInfo) => void;
    setAppVersionInfo: (info: NativeAppVersionInfo) => void;
}
