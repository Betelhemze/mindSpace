import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { getDatabase } from '@/database';
import { useSecurityLock } from '@/hooks/useSecurityLock';
import { useOTAUpdates } from '@/hooks/useOTAUpdates';
import { LockScreen } from '@/components/LockScreen';

function AppContent() {
  const { theme, resolvedColorMode } = useTheme();
  const {
    isLocked,
    isPinConfigured,
    unlockWithBiometrics,
    unlockWithPin,
  } = useSecurityLock();

  // Check for OTA updates after DB is ready
  useOTAUpdates();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={resolvedColorMode === 'dark' ? 'light' : 'dark'} />
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

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const { isCheckingAuth, refreshLockSettings } = useSecurityLock();

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
          <ActivityIndicator size="large" color="#4A4036" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FBF9F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#FBF9F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2022',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 15,
    color: '#5C5D60',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    maxWidth: 360,
  },
  retryButton: {
    backgroundColor: '#4A4036',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
    minWidth: 160,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
