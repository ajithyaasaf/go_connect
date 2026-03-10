import { useOfflineStore } from '../store/useOfflineStore';
import { NetworkMonitor } from './network';
import { ApiService } from './api';
import { withRetry } from './retry';

export const SyncService = {
    /**
     * Start processing the offline queue.
     * Should be called when connection is restored.
     */
    processQueue: async () => {
        const { queue, isSyncing, setSyncing, removeFromQueue } = useOfflineStore.getState();

        if (isSyncing || queue.length === 0) return;

        const isConnected = await NetworkMonitor.checkConnection();
        if (!isConnected) return;

        setSyncing(true);
        console.log('[SyncService] Starting sync...', queue.length, 'items');

        // Process items sequentially to maintain order
        // (Could be parallelized for non-dependent items, but sequential is safer for "Create then Edit" flows)
        for (const action of queue) {
            try {
                await withRetry(() => ApiService.processAction(action));
                removeFromQueue(action.id);
                console.log('[SyncService] Action synced:', action.id);
            } catch (error) {
                console.error('[SyncService] Failed to sync action:', action.id, error);
                // Determine if we should abort the rest of the queue or continue
                // For now, if a persistent error occurs after retries, we likely stop to prevent logical inconsistencies
                // In a real app, we might move this item to a "Dead server" queue or alert the user
                setSyncing(false);
                return;
            }
        }

        setSyncing(false);
        console.log('[SyncService] Sync complete.');
    }
};
