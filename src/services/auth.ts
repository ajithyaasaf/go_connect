import auth, {
    signInAnonymously,
    onAuthStateChanged,
    signOut as firebaseSignOut,
    FirebaseAuthTypes
} from '@react-native-firebase/auth';
import { useAuthStore } from '../store/useAuthStore';
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
    addDoc,
    limit
} from '@react-native-firebase/firestore';
import { dataSyncService } from './dataSync';

class AuthService {
    /**
     * Authenticates the user using a predefined Access Pin.
     * @param pin The string code entered by the user.
     */
    async loginWithAccessKey(pin: string): Promise<boolean> {
        try {
            // 1. BOOTSTRAP CHECK: If DB is empty, allow creating the first Admin key
            await this.ensureBootstrap(pin);

            // 2. Verify Key in Firestore
            const db = firestore();
            const q = query(
                collection(db, 'access_keys'),
                where('code', '==', pin),
                where('isActive', '==', true)
            );
            const keyQuery = await getDocs(q);

            if (keyQuery.empty) {
                throw new Error('Invalid Access PIN.');
            }

            const keyData = keyQuery.docs[0].data();
            console.log('[Auth] PIN Verified. Key Data:', keyData);

            // 3. Anonymous Login (to get a secure UID for RLS)
            console.log('[Auth] Attempting Anonymous Login...');
            const userCredential = await signInAnonymously(auth());
            const uid = userCredential.user.uid;
            console.log('[Auth] Anonymous Auth Success. UID:', uid);

            // 4. Create/Update User Profile based on Key
            console.log('[Auth] Syncing User Profile...');
            const syncedUser = await this.syncUser(uid, keyData.role || 'user', pin);
            console.log('[Auth] User Profile Synced:', syncedUser);

            // 5. Sync Firestore Data to Local Stores
            console.log('[Auth] Starting Global Data Sync...');
            await dataSyncService.syncAllData(syncedUser);
            console.log('[Auth] Global Data Sync Complete.');

            return true;
        } catch (error) {
            console.error('Login Failed at specific step:', error);
            throw error;
        }
    }

    /**
     * Helper: If no keys exist, creates the first ADMIN key if the specific secret is used.
     */
    private async ensureBootstrap(inputPin: string) {
        // Special "Backdoor" for first run only
        const INITIAL_SECRET = '123456';

        if (inputPin === INITIAL_SECRET) {
            const db = firestore();
            const q = query(collection(db, 'access_keys'), limit(1));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                console.log('Bootstrapping Database with Admin Key...');
                await addDoc(collection(db, 'access_keys'), {
                    code: INITIAL_SECRET,
                    role: 'admin',
                    isActive: true,
                    createdAt: serverTimestamp(),
                    note: 'Auto-generated Admin Key'
                });
            }
        }
    }

    /**
     * Signs out the current user.
     */
    async signOut() {
        try {
            await firebaseSignOut(auth());
            dataSyncService.clearLocalData();
            useAuthStore.getState().logout();
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    }

    /**
     * Syncs the anonymous user with a "Real" user profile in Firestore
     */
    private async syncUser(uid: string, role: string, accessKey: string) {
        const db = firestore();
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);

        let userData: any;

        if (userDoc.exists()) {
            userData = userDoc.data();
            await updateDoc(userRef, {
                lastLogin: serverTimestamp(),
            });
        } else {
            userData = {
                id: uid,
                accessKey: accessKey,
                name: role === 'admin' ? 'Admin User' : 'Standard User',
                role: role,
                createdAt: serverTimestamp(),
                settings: {
                    notificationEnabled: true,
                    workingHoursStart: '09:00',
                    workingHoursEnd: '18:00',
                }
            };
            await setDoc(userRef, userData);
        }

        const userProfile = {
            id: uid,
            name: userData?.name || (role === 'admin' ? 'Admin User' : 'Standard User'),
            accessKey: accessKey,
            phone: '',
            role: (userData?.role as any) || role || 'user',
            createdAt: userData?.createdAt || new Date().toISOString(),
        };

        console.log('[Auth] Local Store Updated with:', userProfile);
        useAuthStore.getState().setUser(userProfile);
        return userProfile;
    }

    /**
     * Restore session
     */
    async restoreSession() {
        const currentUser = auth().currentUser;
        if (currentUser) {
            console.log('Restoring session for UID:', currentUser.uid);
            // We need to fetch the existing profile to get the role/accessKey
            const db = firestore();
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

            const exists = (userDoc as any).exists;
            const doesExist = typeof exists === 'function' ? exists() : exists;

            if (doesExist) {
                const data = userDoc.data();
                console.log('User doc found, syncing data...');
                const userProfile = {
                    id: currentUser.uid,
                    name: data?.name || 'User',
                    accessKey: data?.accessKey || '',
                    phone: '',
                    role: data?.role || 'user',
                    createdAt: new Date().toISOString(),
                };
                useAuthStore.getState().setUser(userProfile);
                // Sync data on session restore
                await dataSyncService.syncAllData(userProfile);
            } else {
                console.warn('No user doc found for current user.');
                // We don't sign out automatically here anymore because it might be a fresh 
                // anonymous login that hasn't finished its first sync yet.
                // The RootNavigator or LoginScreen will handle the redirect if not authenticated.
            }
        }
    }
    /**
     * Listener for auth state changes (Session Restoration)
     */
    subscribeToAuthStats(onInit?: (user: FirebaseAuthTypes.User | null) => void) {
        return onAuthStateChanged(auth(), async (user) => {
            if (user) {
                await this.restoreSession();
            } else {
                useAuthStore.getState().logout();
            }
            // Signal that initialization check is complete
            onInit?.(user);
        });
    }
}

export const authService = new AuthService();
