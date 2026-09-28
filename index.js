/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { notificationService } from './src/services/notification';

// ─── FCM Background / Killed-State Handler ────────────────────────────────────
//
// This handler runs in a headless JS task when the app is in the background or
// has been killed. It MUST be registered before AppRegistry so Android can call
// it without launching the full app.
//
// KEY: We use notificationService.handleRemoteMessage() which calls Notifee to
// display a proper local notification (with our custom chime sound & vibration).
// Without this, FCM data-only messages are silently dropped when the app is idle.
//
try {
    const messaging = require('@react-native-firebase/messaging').default;

    messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('[FCM] Background message received:', remoteMessage.messageId);

        // Display the notification using our service so it respects
        // the correct channel (sound, vibration, etc.)
        await notificationService.handleRemoteMessage(remoteMessage);
    });
} catch (error) {
    console.warn('[FCM] Failed to initialize background handler:', error);
}

AppRegistry.registerComponent(appName, () => App);
