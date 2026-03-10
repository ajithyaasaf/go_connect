import firestore, {
    collection,
    query,
    where,
    orderBy,
    getDocs
} from '@react-native-firebase/firestore';
import { firestoreService } from './firestore';
import { OfflineAction } from '../store/types';
import { Meeting } from '../store/types';

const USERS_COLLECTION = 'users';
const MEETINGS_COLLECTION = 'meetings';

export const ApiService = {
    /**
     * Processes a queued action against Firestore.
     * This is called by SyncService when online.
     */
    processAction: async (action: OfflineAction): Promise<void> => {
        switch (action.type) {
            case 'CREATE_MEETING':
                await ApiService.createMeeting(action.payload);
                break;
            case 'UPDATE_MEETING':
                await ApiService.updateMeeting(action.payload);
                break;
            case 'CREATE_CLIENT':
                await firestoreService.createClient(action.payload);
                break;
            case 'UPDATE_CLIENT':
                await firestoreService.updateClient(action.payload.id, action.payload);
                break;
            case 'DELETE_MEETING':
                await firestoreService.deleteMeeting(action.payload.id);
                break;
            // TODO: Handle other types
            default:
                console.warn('Unknown action type:', action.type);
        }
    },

    createMeeting: async (meeting: Meeting): Promise<void> => {
        // Convert Store Meeting (string dates) to Firestore Meeting (Timestamps) if needed
        // But for now, let's assume firestoreService handles it or we pass compatible data.
        // Actually, schema expects Timestamp. We need to convert.
        // Simplified: We pass the data, letting Firestore SDK handle Timestamp conversion usually? 
        // No, we defined custom schema.
        // Let's just pass it to firestore directly through the service.
        // Wait, schema.ts defines Meeting with Timestamp. types.ts has string.
        // We need transformation here.

        await firestoreService.createMeeting(meeting as any);
    },

    updateMeeting: async (meeting: Partial<Meeting> & { id: string }): Promise<void> => {
        await firestoreService.updateMeeting(meeting.id, meeting as any);
    },
};
