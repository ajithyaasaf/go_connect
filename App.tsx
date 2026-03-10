import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { notificationService } from './src/services/notification';
import ErrorBoundary from './src/components/ErrorBoundary';

import { theme } from './src/theme';

function App(): React.JSX.Element {
  useEffect(() => {
    notificationService.initialize().catch(err => {
      console.error('Failed to initialize notifications:', err);
    });
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
      <ErrorBoundary>
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

export default App;
