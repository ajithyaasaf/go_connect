import notifee, { AndroidImportance, TriggerType, TimestampTrigger, EventType } from '@notifee/react-native';
import { format } from 'date-fns';
import messaging from '@react-native-firebase/messaging';
import { Meeting } from '../store/types';
import { useMeetingStore } from '../store/useMeetingStore';
import { useOfflineStore } from '../store/useOfflineStore';
import { differenceInMinutes, parseISO, subMinutes, subDays, setHours, setMinutes, startOfDay } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

class NotificationService {
    private foregroundUnsubscribe?: () => void;

    async initialize() {
        try {
            // Create channels with specific vibration pattern for high priority
            await notifee.createChannel({
                id: 'meeting_reminders',
                name: 'Meeting Reminders',
                importance: AndroidImportance.HIGH,
                vibration: true,
                vibrationPattern: [300, 500, 300, 500], // Distinct pattern
                sound: 'default', // TODO: Custom sound
            });

            await this.requestPermissions();
            this.setupForegroundHandler();
        } catch (error) {
            console.error('[NotificationService] Initialization failed:', error);
        }
    }

    setupForegroundHandler() {
        // Clean up previous listener to prevent duplicates
        this.foregroundUnsubscribe?.();

        this.foregroundUnsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
            const { notification, pressAction } = detail;

            if (type === EventType.PRESS && pressAction?.id === 'mark_done') {
                const meetingId = notification?.data?.meetingId as string;
                if (meetingId) {
                    console.log('[Notification] User marked done via notification:', meetingId);

                    // 1. Update local store (optimistic)
                    useMeetingStore.getState().updateMeeting(meetingId, { status: 'completed' });

                    // 2. Cancel future reminders
                    this.cancelReminders(meetingId);

                    // 3. Queue for sync (works offline!)
                    useOfflineStore.getState().addToQueue({
                        id: uuidv4(),
                        type: 'UPDATE_MEETING',
                        payload: { id: meetingId, status: 'completed' },
                        timestamp: Date.now(),
                        retryCount: 0
                    });

                    // 4. Trigger sync if online
                    const { SyncService } = require('./sync');
                    SyncService.processQueue().catch((err: any) =>
                        console.error('[Notification] Sync failed:', err)
                    );
                }
            }
        });
    }

    // ... (rest of methods)

    async requestPermissions() {
        try {
            await notifee.requestPermission();
            // Request FCM permission
            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (enabled) {
                console.log('Authorization status:', authStatus);
            }
        } catch (error) {
            console.error('[NotificationService] Permission request failed:', error);
        }
    }

    async getFCMToken(): Promise<string | null> {
        try {
            return await messaging().getToken();
        } catch (error) {
            console.error('Error getting FCM token:', error);
            return null;
        }
    }

    async scheduleMeetingReminder(meeting: Meeting) {
        const meetTime = parseISO(meeting.dateTime);

        // 1. Alarm: 30 minutes before
        await this.scheduleLocalNotification(
            meeting,
            subMinutes(meetTime, 30).getTime(),
            '30min',
            `Upcoming Meeting: ${meeting.clientName}`,
            `Starting in 30 mins. ${meeting.purpose}`
        );

        // 2. Alarm: 10 minutes before
        await this.scheduleLocalNotification(
            meeting,
            subMinutes(meetTime, 10).getTime(),
            '10min',
            `Meeting Soon: ${meeting.clientName}`,
            `Starting in 10 mins! tap to view.` // TODO: Deep link
        );

        // 3. Day Before Strategy (11 AM & 6 PM)
        const dayBefore = subDays(meetTime, 1);

        // 11 AM Alert
        const elevenAm = setMinutes(setHours(dayBefore, 11), 0);
        await this.scheduleLocalNotification(
            meeting,
            elevenAm.getTime(),
            'daybefore_morning',
            `Tomorrow's Plan: ${meeting.clientName}`,
            `Reminder: You have a meeting tomorrow at ${format(meetTime, 'HH:mm')}.`
        );

        // 6 PM Alert
        const sixPm = setMinutes(setHours(dayBefore, 18), 0);
        await this.scheduleLocalNotification(
            meeting,
            sixPm.getTime(),
            'daybefore_evening',
            `Evening Check-in: ${meeting.clientName}`,
            `Don't forget your meeting tomorrow at ${format(meetTime, 'HH:mm')}.`
        );
    }

    private async scheduleLocalNotification(
        meeting: Meeting,
        timestamp: number,
        suffix: string,
        title: string,
        body: string
    ) {
        if (timestamp < Date.now()) return; // Don't schedule past alerts

        const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: timestamp,
        };

        try {
            await notifee.createTriggerNotification(
                {
                    id: `${meeting.id}_${suffix}`,
                    title: title,
                    body: body,
                    android: {
                        channelId: 'meeting_reminders',
                        pressAction: {
                            id: 'default',
                        },
                        actions: [
                            {
                                title: 'Mark Done',
                                pressAction: { id: 'mark_done' },
                            },
                        ],
                    },
                    data: {
                        meetingId: meeting.id,
                        action: 'reminder'
                    }
                },
                trigger,
            );
            console.log(`[Notification] Scheduled ${suffix} for ${meeting.clientName}`);
        } catch (e) {
            console.error('[Notification] Error scheduling:', e);
        }
    }

    async cancelReminders(meetingId: string) {
        // Cancel all 4 notification types
        await notifee.cancelNotification(`${meetingId}_30min`);
        await notifee.cancelNotification(`${meetingId}_10min`);
        await notifee.cancelNotification(`${meetingId}_daybefore_morning`);
        await notifee.cancelNotification(`${meetingId}_daybefore_evening`);
        console.log(`[Notification] Cancelled all reminders for meeting: ${meetingId}`);
    }
}

export const notificationService = new NotificationService();
