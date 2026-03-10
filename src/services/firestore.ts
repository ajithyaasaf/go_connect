import firestore, {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    doc,
    serverTimestamp,
    Timestamp
} from '@react-native-firebase/firestore';
import { Client, Meeting, User } from './schema';

class FirestoreService {
    // --- Serialization Helpers ---

    private mapTimestampsToStrings(data: any): any {
        if (!data) return data;

        const mapped: any = { ...data };
        for (const key in mapped) {
            const value = mapped[key];
            if (value && typeof value === 'object' && typeof value.toDate === 'function') {
                // It's a Firestore Timestamp
                mapped[key] = value.toDate().toISOString();
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                // Recursive for nested objects (like settings)
                mapped[key] = this.mapTimestampsToStrings(value);
            }
        }
        return mapped;
    }

    private mapStringsToTimestamps(data: any): any {
        if (!data) return data;

        const mapped: any = { ...data };
        for (const key in mapped) {
            const value = mapped[key];
            // Simple heuristic: if it looks like an ISO date string
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                mapped[key] = Timestamp.fromDate(new Date(value));
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                mapped[key] = this.mapStringsToTimestamps(value);
            }
        }
        return mapped;
    }

    // --- Client Operations ---

    async createClient(client: Client): Promise<void> {
        console.log(`[Firestore] createClient called for ID: ${client.id}. Targeted Collection: 'clients'`);
        // Ensure accessKey is set from the client's own property or derived context
        const firestoreData = this.mapStringsToTimestamps(client);
        const db = firestore();
        await setDoc(doc(db, 'clients', client.id), firestoreData);
        console.log(`[Firestore] createClient SUCCESS for ID: ${client.id}`);
    }

    async updateClient(clientId: string, data: Partial<Client>): Promise<void> {
        const db = firestore();
        await updateDoc(doc(db, 'clients', clientId), {
            ...data,
            updatedAt: serverTimestamp(),
        });
    }

    async getClient(clientId: string): Promise<Client | null> {
        const db = firestore();
        const docSnap = await getDoc(doc(db, 'clients', clientId));

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...this.mapTimestampsToStrings(docSnap.data())
            } as Client;
        }
        return null;
    }

    async getClientsForUser(accessKey: string): Promise<Client[]> {
        console.log(`[Firestore] Fetching clients for accessKey: ${accessKey}`);
        const db = firestore();
        // Shifted from userId to accessKey for deterministic cross-device sync
        const q = query(collection(db, 'clients'), where('accessKey', '==', accessKey));
        const snapshot = await getDocs(q);

        console.log(`[Firestore] Found ${snapshot.docs.length} clients matching PIN: ${accessKey}`);
        return snapshot.docs.map((docSnap: any) => ({
            id: docSnap.id,
            ...this.mapTimestampsToStrings(docSnap.data())
        })) as Client[];
    }

    // --- Meeting Operations ---

    async createMeeting(meeting: Meeting): Promise<void> {
        console.log(`[Firestore] createMeeting called for ID: ${meeting.id}. Targeted Collection: 'meetings'`);
        // Ensure accessKey is present for deterministic sync
        const firestoreData = this.mapStringsToTimestamps(meeting);
        const db = firestore();
        await setDoc(doc(db, 'meetings', meeting.id), firestoreData);
        console.log(`[Firestore] createMeeting SUCCESS for ID: ${meeting.id}`);
    }

    async updateMeeting(meetingId: string, data: Partial<Meeting>): Promise<void> {
        const db = firestore();
        await updateDoc(doc(db, 'meetings', meetingId), data);
    }

    async getMeetingsForUser(accessKey: string): Promise<Meeting[]> {
        console.log(`[Firestore] Fetching meetings for accessKey: ${accessKey}`);
        const db = firestore();
        // Shifted from userId to accessKey for deterministic cross-device sync
        const q = query(collection(db, 'meetings'), where('accessKey', '==', accessKey));
        const snapshot = await getDocs(q);

        return snapshot.docs.map((docSnap: any) => ({
            id: docSnap.id,
            ...this.mapTimestampsToStrings(docSnap.data())
        })) as Meeting[];
    }

    async getMeeting(meetingId: string): Promise<Meeting | null> {
        const db = firestore();
        const docSnap = await getDoc(doc(db, 'meetings', meetingId));

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...this.mapTimestampsToStrings(docSnap.data())
            } as Meeting;
        }
        return null;
    }
    async deleteMeeting(meetingId: string): Promise<void> {
        console.log(`[Firestore] deleteMeeting called for ID: ${meetingId}`);
        const db = firestore();
        await db.collection('meetings').doc(meetingId).delete();
        console.log(`[Firestore] deleteMeeting SUCCESS for ID: ${meetingId}`);
    }
}

export const firestoreService = new FirestoreService();
