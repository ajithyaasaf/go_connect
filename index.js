/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Register background handler for FCM - wrapped in try-catch for safety
try {
    const messaging = require('@react-native-firebase/messaging').default;
    messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('Message handled in the background!', remoteMessage);
    });
} catch (error) {
    console.warn('Failed to initialize FCM background handler:', error);
}

AppRegistry.registerComponent(appName, () => App);
