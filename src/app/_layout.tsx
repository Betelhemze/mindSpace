import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { getDatabase } from '@/database';
import { useSecurityLock } from '@/hooks/useSecurityLock';
import { useOTAUpdates } from '@/hooks/useOTAUpdates';
import { LockScreen } from '@/components/LockScreen';

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const {
    isLocked,
    isPinConfigured,
    unlockWithBiometrics,
    unlockWithPin,
    isCheckingAuth,
    refreshLockSettings,
  } = useSecurityLock();

  // Check for OTA updates after DB is ready
  useOTAUpdates();

  const initDb = useCallback(async () => {
    setInitError(null);
    setIsRetrying(true);
    try {
      await getDatabase();
      setIsDbReady(true);
      await refreshLockSettings();
    } catch (err: any) {
      console.error('[RootLayout] DB initialization error:', err);
      const isLock =
        err?.message?.includes('createSyncAccessHandle') ||
        err?.message?.includes('Access Handle');

      if (isLock) {
        setInitError(
          'Database is open in another browser tab. Please close other Mindspace tabs in your browser, then click Retry.'
        );
      } else {
        setInitError(err?.message || 'Failed to initialize database.');
      }
    } finally {
      setIsRetrying(false);
    }
  }, [refreshLockSettings]);

  useEffect(() => {
    initDb();
  }, [initDb]);

  if (initError) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.errorContainer} edges={['top', 'left', 'right', 'bottom']}>
          <StatusBar style="dark" />
          <Text style={styles.errorTitle}>Mindspace Database</Text>
          <Text style={styles.errorMessage}>{initError}</Text>
          <TouchableOpacity
            onPress={initDb}
            disabled={isRetrying}
            style={styles.retryButton}
            activeOpacity={0.8}
          >
            {isRetrying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.retryButtonText}>Retry Connection</Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!isDbReady || isCheckingAuth) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingContainer} edges={['top', 'left', 'right', 'bottom']}>
          <StatusBar style="dark" />
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
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
  errorContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorTitle: {
    fontSize: theme.typography.sizes.title,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  errorMessage: {
    fontSize: theme.typography.sizes.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeights.body,
    marginBottom: theme.spacing.xl,
    maxWidth: 360,
  },
  retryButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.full,
    minWidth: 160,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.body,
    fontWeight: '600',
  },
});
