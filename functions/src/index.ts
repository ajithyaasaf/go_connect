import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Types for better code safety (subset of app types)
interface Meeting {
    id: string;
    userId: string;
    clientName: string;
    dateTime: string;
    status: string;
}

/**
 * TRIGGER: On Meeting Create
 * Purpose: Schedule remote push notifications for 24h before and 3h before.
 * Reliability: Retries enabled on failure.
 */
export const onMeetingCreate = functions.firestore
    .document('meetings/{meetingId}')
    .onCreate(async (snap, context) => {
        const meeting = snap.data() as Meeting;
        const meetingId = context.params.meetingId;
        const dateTime = new Date(meeting.dateTime);

        console.log(`[Meeting Created] ID: ${meetingId} for User: ${meeting.userId}`);

        // In a real app with 'Blaze' plan, we would use Cloud Tasks to schedule exact delivery.
        // For this 'Spark/Blaze' prototype, we simulate scheduling by creating a 'notification_queue' document.
        // A simplified approach for reliability:
        // We create a notification record that a scheduled job polls.

        try {
            await admin.firestore().collection('notification_queue').add({
                meetingId,
                userId: meeting.userId,
                targetTime: dateTime.getTime(),
                type: 'scheduled_reminders',
                status: 'pending',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`[Scheduler] Queue item added for ${meeting.clientName}`);
        } catch (e) {
            console.error(`[Error] Failed to schedule notification for ${meetingId}`, e);
            throw e; // Retry
        }
    });

/**
 * SCHEDULED JOB: Daily Overdue Check (Every day at 8 AM)
 * Purpose: Scan for missed meetings and alert the user.
 */
export const dailyOverdueCheck = functions.pubsub
    .schedule('0 8 * * *')
    .timeZone('Asia/Kolkata')
    .onRun(async (context) => {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Find meetings from yesterday that are still 'scheduled' (not done/cancelled)
        // Note: This requires a composite index on status + dateTime
        const snapshot = await admin.firestore()
            .collection('meetings')
            .where('status', '==', 'scheduled')
            .where('dateTime', '<', now.toISOString())
            .where('dateTime', '>', yesterday.toISOString())
            .get();

        if (snapshot.empty) {
            console.log('No overdue meetings found.');
            return null;
        }

        const batch = admin.firestore().batch();
        const processedUsers = new Set<string>();

        snapshot.docs.forEach(doc => {
            const data = doc.data() as Meeting;
            // Mark as missed? Or just notify? Let's just notify for now.
            if (!processedUsers.has(data.userId)) {
                // Send FCM to user saying "You missed X meetings yesterday"
                // sendFCM(data.userId, ...)
                processedUsers.add(data.userId);
            }
        });

        console.log(`Processed overdue check for ${snapshot.size} meetings.`);
        return null;
    });

/**
 * SCHEDULED JOB: Self-Healing Notification Verifier (Every hour)
 * Purpose: "Belt and Suspenders". Checks meetings in next 24h.
 * Ensures a 'notification_queue' item exists. If not, creates it.
 */
export const verifyNotifications = functions.pubsub
    .schedule('0 * * * *') // Hourly
    .onRun(async (context) => {
        const now = new Date();
        const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const snapshot = await admin.firestore()
            .collection('meetings')
            .where('dateTime', '>', now.toISOString())
            .where('dateTime', '<', next24h.toISOString())
            .where('status', '==', 'scheduled')
            .get();

        // For each meeting, check if queue exists
        for (const doc of snapshot.docs) {
            const queueSnap = await admin.firestore()
                .collection('notification_queue')
                .where('meetingId', '==', doc.id)
                .limit(1)
                .get();

            if (queueSnap.empty) {
                console.warn(`[Self-Healing] Found meeting ${doc.id} without notification queue. repairing...`);
                await admin.firestore().collection('notification_queue').add({
                    meetingId: doc.id,
                    userId: doc.data().userId,
                    targetTime: new Date(doc.data().dateTime).getTime(),
                    type: 'repaired_reminder',
                    status: 'pending',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        return null;
    });
