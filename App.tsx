import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { notificationService } from './src/services/notification';
import { otaService } from './src/ota/OtaService';
import { remoteConfigService } from './src/services/remoteConfig';
import { OtaErrorBoundary } from './src/ota/OtaErrorBoundary';
import { OtaUpdateModal } from './src/ota/OtaUpdateModal';

import { theme } from './src/theme';

function App(): React.JSX.Element {
  useEffect(() => {
    // 1. Initialize notifications
    notificationService.initialize().catch(err => {
      console.error('[App] Failed to initialize notifications:', err);
    });

    // 2. Handle FCM messages
    notificationService.setupFCMHandler();

    // 3. Initialize OTA subsystem & SafeBoot verification
    otaService.initialize().catch(err => {
      console.warn('[App] OTA initialization warning:', err);
    });

    // 4. Initialize Remote Config Realtime Listener
    remoteConfigService.initialize();

    // Cleanup listeners when root unmounts
    return () => {
      notificationService.destroy();
      otaService.destroy();
      remoteConfigService.destroy();
    };
  }, []);

  const navTheme = {
    dark: false,
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.primary,
    },
  };

  return (
    <SafeAreaProvider>
      <OtaErrorBoundary>
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
        <OtaUpdateModal />
      </OtaErrorBoundary>
    </SafeAreaProvider>
  );
}

export default App;
