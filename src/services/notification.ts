import notifee, { AndroidImportance, TriggerType, TimestampTrigger, EventType, AndroidCategory } from '@notifee/react-native';
import { format } from 'date-fns';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Meeting } from '../store/types';
import { useMeetingStore } from '../store/useMeetingStore';
import { useOfflineStore } from '../store/useOfflineStore';
import { parseISO, subMinutes, subDays, setHours, setMinutes } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// ─── Channel IDs ─────────────────────────────────────────────────────────────
const CHANNELS = {
    /** Standard reminders: day-before and 30-min alerts (chime sound) */
    STANDARD: 'meeting_reminders',
    /** Urgent reminders: 10-min alert (louder vibration pattern + chime) */
    URGENT: 'meeting_reminders_urgent',
    /** FCM push notifications from the server */
    PUSH: 'push_notifications',
} as const;

// ─── Vibration patterns ───────────────────────────────────────────────────────
// NOTE: Notifee requires all values to be strictly positive (> 0).
// Pattern: [initialDelay, vibrateMs, pauseMs, vibrateMs, ...]
const VIBRATION: { STANDARD: number[]; URGENT: number[] } = {
    STANDARD: [100, 300, 200, 300],           // Two short pulses
    URGENT: [100, 400, 200, 400, 200, 400], // Three strong pulses
};

// ─── NotificationService ─────────────────────────────────────────────────────

class NotificationService {
    private foregroundUnsubscribe?: () => void;
    private fcmForegroundUnsubscribe?: () => void;

    // ── Initialization ────────────────────────────────────────────────────────

    async initialize() {
        try {
            await this.createChannels();
            await this.requestPermissions();
            this.setupForegroundHandler();
        } catch (error) {
            console.error('[NotificationService] Initialization failed:', error);
        }
    }

    private async createChannels() {
        // Standard channel: day-before and 30-min alerts
        await notifee.createChannel({
            id: CHANNELS.STANDARD,
            name: 'Meeting Reminders',
            description: 'Reminders for upcoming meetings',
            importance: AndroidImportance.HIGH,
            vibration: true,
            vibrationPattern: VIBRATION.STANDARD,
            sound: 'reminder_sound', // Uses res/raw/reminder_sound.wav
        });

        // Urgent channel: 10-min alerts — more aggressive
        await notifee.createChannel({
            id: CHANNELS.URGENT,
            name: 'Urgent Meeting Alerts',
            description: 'High-priority alerts for imminent meetings',
            importance: AndroidImportance.HIGH,
            vibration: true,
            vibrationPattern: VIBRATION.URGENT,
            sound: 'reminder_sound',
        });

        // Push channel: server-sent notifications
        await notifee.createChannel({
            id: CHANNELS.PUSH,
            name: 'Push Notifications',
            description: 'Notifications from the GoConnect server',
            importance: AndroidImportance.DEFAULT,
            vibration: true,
            vibrationPattern: VIBRATION.STANDARD,
            sound: 'reminder_sound',
        });
    }

    // ── Permissions ───────────────────────────────────────────────────────────

    async requestPermissions() {
        try {
            await notifee.requestPermission();
            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;
            if (!enabled) {
                console.warn('[NotificationService] FCM permission not granted');
            }
        } catch (error) {
            console.error('[NotificationService] Permission request failed:', error);
        }
    }

    // ── FCM Token ─────────────────────────────────────────────────────────────

    async getFCMToken(): Promise<string | null> {
        try {
            return await messaging().getToken();
        } catch (error) {
            console.error('[NotificationService] Error getting FCM token:', error);
            return null;
        }
    }

    // ── FCM Foreground Handler ────────────────────────────────────────────────

    /**
     * Call this once after app mounts (in App.tsx useEffect).
     * Handles FCM messages while the app is in the foreground.
     * Background & killed-state messages are handled in index.js via
     * setBackgroundMessageHandler + notificationService.handleRemoteMessage.
     */
    setupFCMHandler() {
        // Clean up previous listener
        this.fcmForegroundUnsubscribe?.();

        this.fcmForegroundUnsubscribe = messaging().onMessage(async remoteMessage => {
            console.log('[FCM] Foreground message received:', remoteMessage.messageId);
            await this.handleRemoteMessage(remoteMessage);
        });
    }

    /**
     * Converts a raw FCM RemoteMessage into a displayed Notifee notification.
     * Safe to call from both foreground and background contexts.
     */
    async handleRemoteMessage(remoteMessage: FirebaseMessagingTypes.RemoteMessage) {
        const { notification, data } = remoteMessage;

        const title = notification?.title ?? data?.title as string ?? 'GoConnect';
        const body = notification?.body ?? data?.body as string ?? '';

        if (!body) return; // Nothing meaningful to show

        try {
            await notifee.displayNotification({
                title,
                body,
                android: {
                    channelId: CHANNELS.PUSH,
                    category: AndroidCategory.MESSAGE,
                    pressAction: { id: 'default' },
                    sound: 'reminder_sound',
                    vibrationPattern: VIBRATION.STANDARD,
                    // Show on lock-screen even when app is killed
                    showTimestamp: true,
                },
                data: data ?? {},
            });
        } catch (error) {
            console.error('[NotificationService] Error displaying FCM notification:', error);
        }
    }

    // ── Notifee Foreground Event Handler ──────────────────────────────────────

    setupForegroundHandler() {
        this.foregroundUnsubscribe?.();

        this.foregroundUnsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
            if (type !== EventType.PRESS) return;

            const { notification, pressAction } = detail;

            if (pressAction?.id === 'mark_done') {
                const meetingId = notification?.data?.meetingId as string | undefined;
                if (!meetingId) return;

                console.log('[Notification] Mark done pressed for meeting:', meetingId);

                // 1. Optimistic local update
                useMeetingStore.getState().updateMeeting(meetingId, { status: 'completed' });

                // 2. Cancel future reminders immediately
                this.cancelReminders(meetingId);

                // 3. Queue for sync (works offline)
                useOfflineStore.getState().addToQueue({
                    id: uuidv4(),
                    type: 'UPDATE_MEETING',
                    payload: { id: meetingId, status: 'completed' },
                    timestamp: Date.now(),
                    retryCount: 0,
                });

                // 4. Kick off sync if online
                const { SyncService } = require('./sync');
                SyncService.processQueue().catch((err: unknown) =>
                    console.error('[Notification] Sync failed after mark_done:', err)
                );
            }
        });
    }

    // ── Scheduling ────────────────────────────────────────────────────────────

    async scheduleMeetingReminder(meeting: Meeting) {
        const meetTime = parseISO(meeting.dateTime);

        // 1. 30 minutes before (standard priority)
        await this.scheduleLocalNotification({
            meeting,
            timestamp: subMinutes(meetTime, 30).getTime(),
            suffix: '30min',
            channelId: CHANNELS.STANDARD,
            title: `Upcoming Meeting: ${meeting.clientName}`,
            body: `Starting in 30 minutes. ${meeting.purpose}`,
        });

        // 2. 10 minutes before (URGENT)
        await this.scheduleLocalNotification({
            meeting,
            timestamp: subMinutes(meetTime, 10).getTime(),
            suffix: '10min',
            channelId: CHANNELS.URGENT,
            title: `Meeting Starting Soon: ${meeting.clientName}`,
            body: `Starting in 10 minutes! Tap to view details.`,
        });

        // 3. Day before at 11 AM
        const dayBefore = subDays(meetTime, 1);
        await this.scheduleLocalNotification({
            meeting,
            timestamp: setMinutes(setHours(dayBefore, 11), 0).getTime(),
            suffix: 'daybefore_morning',
            channelId: CHANNELS.STANDARD,
            title: `Tomorrow's Meeting: ${meeting.clientName}`,
            body: `Reminder: You have a meeting tomorrow at ${format(meetTime, 'HH:mm')}.`,
        });

        // 4. Day before at 6 PM
        await this.scheduleLocalNotification({
            meeting,
            timestamp: setMinutes(setHours(dayBefore, 18), 0).getTime(),
            suffix: 'daybefore_evening',
            channelId: CHANNELS.STANDARD,
            title: `Evening Check-in: ${meeting.clientName}`,
            body: `Don't forget your meeting tomorrow at ${format(meetTime, 'HH:mm')}.`,
        });
    }

    private async scheduleLocalNotification({
        meeting,
        timestamp,
        suffix,
        channelId,
        title,
        body,
    }: {
        meeting: Meeting;
        timestamp: number;
        suffix: string;
        channelId: string;
        title: string;
        body: string;
    }) {
        if (timestamp <= Date.now()) {
            console.log(`[Notification] Skipping past alert (${suffix}) for ${meeting.clientName}`);
            return;
        }

        const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp,
        };

        try {
            await notifee.createTriggerNotification(
                {
                    id: `${meeting.id}_${suffix}`,
                    title,
                    body,
                    android: {
                        channelId,
                        category: AndroidCategory.REMINDER,
                        pressAction: { id: 'default' },
                        actions: [
                            {
                                title: '✓ Mark Done',
                                pressAction: { id: 'mark_done' },
                            },
                        ],
                        showTimestamp: true,
                    },
                    data: {
                        meetingId: meeting.id,
                        action: 'reminder',
                    },
                },
                trigger,
            );
            console.log(`[Notification] Scheduled ${suffix} for "${meeting.clientName}"`);
        } catch (error) {
            console.error(`[Notification] Failed to schedule ${suffix}:`, error);
        }
    }

    // ── Cancellation ──────────────────────────────────────────────────────────

    async cancelReminders(meetingId: string) {
        const suffixes = ['30min', '10min', 'daybefore_morning', 'daybefore_evening'];
        await Promise.all(
            suffixes.map(suffix =>
                notifee.cancelNotification(`${meetingId}_${suffix}`)
                    .catch(err => console.warn(`[Notification] Failed to cancel ${suffix}:`, err))
            )
        );
        console.log(`[Notification] Cancelled all reminders for meeting: ${meetingId}`);
    }

    // ── Cleanup ───────────────────────────────────────────────────────────────

    destroy() {
        this.foregroundUnsubscribe?.();
        this.fcmForegroundUnsubscribe?.();
    }
}

export const notificationService = new NotificationService();
