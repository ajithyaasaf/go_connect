import { z } from 'zod';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// Helper for Firestore Timestamp validation
const TimestampSchema = z.custom<FirebaseFirestoreTypes.Timestamp>(
    (data) => data && typeof (data as any).toDate === 'function',
    { message: 'Invalid Firestore Timestamp' }
);

// --- 1. User Schema ---
export const UserSchema = z.object({
    id: z.string(),
    accessKey: z.string(),
    name: z.string().min(1, 'Name is required'),
    role: z.enum(['admin', 'user']),
    lastLogin: z.string().optional(),
    createdAt: z.string(),
    settings: z.object({
        notificationEnabled: z.boolean(),
        workingHoursStart: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
        workingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
    }),
});

export type User = z.infer<typeof UserSchema>;

// --- 2. Client Schema ---
export const ClientSchema = z.object({
    id: z.string(),
    userId: z.string(), // Owner ID
    name: z.string().min(1, 'Client Name is required'),
    phone: z.string().min(10, 'Valid phone number required'),
    company: z.string().optional(),
    notes: z.string().optional(),
    accessKey: z.string().min(1, 'Access Key is required'), // Shared key for deterministic sync
    createdAt: z.string(),
    updatedAt: z.string().optional(),
});

export type Client = z.infer<typeof ClientSchema>;

// --- 3. Meeting Schema ---
export const MeetingSchema = z.object({
    id: z.string(),
    userId: z.string(),
    clientId: z.string(),
    clientName: z.string(), // Denormalized
    clientPhone: z.string(),
    purpose: z.enum(['Sales', 'Follow-up', 'Review', 'General']),
    action: z.enum(['Call', 'Visit', 'Email']),
    dateTime: z.string(),
    status: z.enum(['scheduled', 'completed', 'missed', 'cancelled']).default('scheduled'),
    notes: z.string().optional(),
    voiceUrl: z.string().optional(),
    remindersScheduled: z.boolean().default(false),
    accessKey: z.string().min(1, 'Access Key is required'), // Shared key for deterministic sync
    createdAt: z.string(),
    updatedAt: z.string().optional(),
});

export type Meeting = z.infer<typeof MeetingSchema>;

// --- 4. Notification Schema (Local) ---
export const NotificationSchema = z.object({
    id: z.string(),
    meetingId: z.string(),
    type: z.enum(['warning', 'urgent']),
    scheduledTime: z.number(), // Unix timestamp for local scheduling
    status: z.enum(['scheduled', 'sent', 'cancelled']),
});

export type LocalNotification = z.infer<typeof NotificationSchema>;
