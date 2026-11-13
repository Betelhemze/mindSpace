import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { getDatabase } from '@/database';
import { useSecurityLock } from '@/hooks/useSecurityLock';
import { LockScreen } from '@/components/LockScreen';

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const {
    isLocked,
    isPinConfigured,
    unlockWithBiometrics,
    unlockWithPin,
    isCheckingAuth,
  } = useSecurityLock();

  useEffect(() => {
    async function initDb() {
      try {
        await getDatabase();
        setIsDbReady(true);
      } catch (err: any) {
        console.error('[RootLayout] DB initialization error:', err);
        setInitError(err?.message || 'Failed to initialize database.');
      }
    }
    initDb();
  }, []);

  if (!isDbReady || isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="write"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="edit/[id]"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>

      {/* Security overlay if locked */}
      {isLocked && (
        <LockScreen
          onUnlockWithBiometrics={unlockWithBiometrics}
          onUnlockWithPin={unlockWithPin}
          isPinConfigured={isPinConfigured}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
