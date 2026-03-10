import { Meeting } from '../services/schema';

export type { Meeting };

export type OfflineActionType = 'CREATE_MEETING' | 'UPDATE_MEETING' | 'DELETE_MEETING' | 'MARK_DONE' | 'CREATE_CLIENT' | 'UPDATE_CLIENT';

export interface OfflineAction {
    id: string;
    type: OfflineActionType;
    payload: any;
    timestamp: number;
    retryCount: number;
}

export interface UserProfile {
    id: string;
    name: string;
    phone?: string;
    accessKey: string;
    role: 'admin' | 'user';
    createdAt: string;
}
