import { firestoreService } from './firestore';
import { useMeetingStore } from '../store/useMeetingStore';
import { useClientStore } from '../store/useClientStore';
import { NetworkMonitor } from './network';

/**
 * Options for controlling sync behavior
 */
interface SyncOptions {
    /** Force sync even if data is already cached for this user */
    force?: boolean;
    /** Allow using cached data if offline */
    useCache?: boolean;
}

/**
 * User object expected by sync service
 */
interface SyncUser {
    accessKey: string;
    uid?: string;
    role?: string;
}

/**
 * Production-grade data synchronization service
 * 
 * Features:
 * - Promise-based deduplication (prevents concurrent syncs)
 * - AccessKey versioning (tracks which user's data is loaded)
 * - Atomic rollback on failures (all-or-nothing updates)
 * - Network state awareness
 * - Comprehensive error handling and logging
 */
class DataSyncService {
    /** Currently active sync promise (used for deduplication) */
    private syncPromise: Promise<void> | null = null;

    /** AccessKey of the last successfully synced user */
    private lastSyncedAccessKey: string | null = null;

    /** Timestamp of last successful sync (for debugging/metrics) */
    private lastSyncTimestamp: number = 0;

    /**
     * Synchronizes all user data from Firestore to local stores
     * 
     * @param user - User object containing accessKey
     * @param options - Sync control options
     * @returns Promise that resolves when sync completes
     * 
     * @example
     * // Basic usage
     * await dataSyncService.syncAllData(user);
     * 
     * // Force refresh (ignore cache)
     * await dataSyncService.syncAllData(user, { force: true });
     */
    async syncAllData(user: SyncUser, options: SyncOptions = {}): Promise<void> {
        // Validate input
        if (!user?.accessKey) {
            console.warn('[DataSync] Cannot sync: No accessKey provided');
            return;
        }

        // Deduplication: Return existing promise if sync in progress
        if (this.syncPromise && !options.force) {
            console.log('[DataSync] Sync already in progress, returning existing promise');
            return this.syncPromise;
        }

        // Cache check: Skip if already synced for this user (unless forced)
        if (
            user.accessKey === this.lastSyncedAccessKey &&
            !options.force
        ) {
            console.log('[DataSync] Data already synced for accessKey:', user.accessKey);
            return;
        }

        // Create new sync promise and track it
        this.syncPromise = this._performSync(user, options);

        // Cleanup: Clear promise reference when done (success or fail)
        return this.syncPromise.finally(() => {
            this.syncPromise = null;
        });
    }

    /**
     * Internal method that performs the actual sync operation
     * Separated for cleaner promise management
     */
    private async _performSync(user: SyncUser, options: SyncOptions): Promise<void> {
        const startTime = Date.now();
        console.log('[DataSync] Starting sync for accessKey:', user.accessKey);

        // Network check (skip if useCache option is set)
        if (!options.useCache) {
            const isOnline = await NetworkMonitor.checkConnection();
            if (!isOnline) {
                const error = new Error('Cannot sync: No network connection');
                console.error('[DataSync]', error.message);
                throw error;
            }
        }

        // Backup current data for rollback capability
        const clientStore = useClientStore.getState();
        const meetingStore = useMeetingStore.getState();
        const backupClients = [...clientStore.clients];
        const backupMeetings = [...meetingStore.meetings];

        try {
            // Fetch clients
            console.log('[DataSync] Fetching clients...');
            const clients = await firestoreService.getClientsForUser(user.accessKey);
            console.log('[DataSync] Loaded clients:', clients.length);
            clientStore.setClients(clients);

            // Fetch meetings
            console.log('[DataSync] Fetching meetings...');
            const meetings = await firestoreService.getMeetingsForUser(user.accessKey);
            console.log('[DataSync] Loaded meetings:', meetings.length);
            meetingStore.setMeetings(meetings);

            // Commit: Mark this accessKey as successfully synced
            this.lastSyncedAccessKey = user.accessKey;
            this.lastSyncTimestamp = Date.now();

            const duration = Date.now() - startTime;
            console.log('[DataSync] ✅ Sync completed successfully in', duration, 'ms');
        } catch (error) {
            // Rollback: Restore previous data on any failure
            console.error('[DataSync] ❌ Sync failed, rolling back...', error);
            clientStore.setClients(backupClients);
            meetingStore.setMeetings(backupMeetings);

            // Re-throw to allow caller to handle
            throw error;
        }
    }

    /**
     * Clears all local data and sync state
     * Should be called on logout
     */
    clearLocalData(): void {
        console.log('[DataSync] Clearing local data...');

        // Clear stores
        useClientStore.getState().setClients([]);
        useMeetingStore.getState().setMeetings([]);

        // Reset sync state
        this.lastSyncedAccessKey = null;
        this.lastSyncTimestamp = 0;

        console.log('[DataSync] Local data cleared');
    }

    /**
     * Force refresh data for current user
     * Useful for pull-to-refresh scenarios
     */
    async forceRefresh(user: SyncUser): Promise<void> {
        console.log('[DataSync] Force refresh requested');
        return this.syncAllData(user, { force: true });
    }

    /**
     * Get sync metadata (for debugging/diagnostics)
     */
    getSyncMetadata() {
        return {
            lastSyncedAccessKey: this.lastSyncedAccessKey,
            lastSyncTimestamp: this.lastSyncTimestamp,
            isSyncing: this.syncPromise !== null,
        };
    }
}

export const dataSyncService = new DataSyncService();
