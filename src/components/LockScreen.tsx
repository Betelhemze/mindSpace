import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { Icon } from './Icon';

interface LockScreenProps {
  onUnlockWithBiometrics: () => Promise<boolean>;
  onUnlockWithPin: (pin: string) => Promise<boolean>;
  isPinConfigured: boolean;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  onUnlockWithBiometrics,
  onUnlockWithPin,
  isPinConfigured,
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const handleKeyPress = async (digit: string) => {
    if (isVerifying || pin.length >= 4) return;

    const newPin = pin + digit;
    setPin(newPin);
    setErrorMessage('');

    if (newPin.length === 4) {
      setIsVerifying(true);
      const success = await onUnlockWithPin(newPin);
      if (!success) {
        Vibration.vibrate();
        setErrorMessage('Incorrect PIN. Please try again.');
        setPin('');
      }
      setIsVerifying(false);
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin((prev) => prev.slice(0, -1));
      setErrorMessage('');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Icon name="lock" size={30} color={theme.colors.accent} />
        </View>
        <Text style={styles.title}>Mindspace is locked</Text>
        <Text style={styles.subtitle}>Your personal thoughts are encrypted & private.</Text>
      </View>

      {/* Biometric trigger button */}
      <TouchableOpacity
        style={styles.biometricButton}
        onPress={onUnlockWithBiometrics}
        activeOpacity={0.8}
      >
        <Icon name="shield" size={20} color={theme.colors.accent} style={styles.biometricIcon} />
        <Text style={styles.biometricButtonText}>Unlock with Biometrics</Text>
      </TouchableOpacity>

      {/* PIN entry if PIN is configured */}
      {isPinConfigured && (
        <View style={styles.pinSection}>
          <Text style={styles.pinLabel}>or enter your 4-digit PIN</Text>

          {/* PIN dots */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((index) => {
              const isFilled = pin.length > index;
              return (
                <View
                  key={index}
                  style={[styles.dot, isFilled && styles.dotFilled]}
                />
              );
            })}
          </View>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : (
            <View style={{ height: 20 }} />
          )}

          {/* Keypad */}
          <View style={styles.keypad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['', '0', 'delete'],
            ].map((row, rIndex) => (
              <View key={rIndex} style={styles.keypadRow}>
                {row.map((item, cIndex) => {
                  if (item === '') {
                    return <View key={cIndex} style={styles.keyButtonEmpty} />;
                  }
                  if (item === 'delete') {
                    return (
                      <TouchableOpacity
                        key={cIndex}
                        style={styles.keyButton}
                        onPress={handleDelete}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Icon name="delete" size={20} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={cIndex}
                      style={styles.keyButton}
                      onPress={() => handleKeyPress(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.keyText}>{item}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.background,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.sizes.title,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xxl,
  },
  biometricIcon: {
    marginRight: theme.spacing.sm,
  },
  biometricButtonText: {
    fontSize: theme.typography.sizes.body,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  pinSection: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 280,
  },
  pinLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: theme.colors.textMuted,
    marginHorizontal: theme.spacing.md,
  },
  dotFilled: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  errorText: {
    color: theme.colors.statusError,
    fontSize: theme.typography.sizes.xs,
    height: 20,
    textAlign: 'center',
  },
  keypad: {
    width: '100%',
    marginTop: theme.spacing.md,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  keyButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  keyButtonEmpty: {
    width: 64,
    height: 64,
  },
  keyText: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});
