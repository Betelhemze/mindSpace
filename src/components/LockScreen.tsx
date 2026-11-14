import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
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
  const { theme } = useTheme();
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: theme.colors.surfaceSubtle,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Icon name="lock" size={30} color={theme.colors.accent} />
        </View>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Mindspace is locked</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Your personal thoughts are encrypted & private.
        </Text>
      </View>

      {/* Biometric trigger button */}
      <TouchableOpacity
        style={[
          styles.biometricButton,
          {
            backgroundColor: theme.colors.surfaceSubtle,
            borderColor: theme.colors.border,
          },
        ]}
        onPress={onUnlockWithBiometrics}
        activeOpacity={0.8}
      >
        <Icon name="shield" size={20} color={theme.colors.accent} style={styles.biometricIcon} />
        <Text style={[styles.biometricButtonText, { color: theme.colors.accent }]}>Unlock with Biometrics</Text>
      </TouchableOpacity>

      {/* PIN entry if PIN is configured */}
      {isPinConfigured && (
        <View style={styles.pinSection}>
          <Text style={[styles.pinLabel, { color: theme.colors.textMuted }]}>or enter your 4-digit PIN</Text>

          {/* PIN dots */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((index) => {
              const isFilled = pin.length > index;
              return (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    { borderColor: theme.colors.textMuted },
                    isFilled && [styles.dotFilled, { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }],
                  ]}
                />
              );
            })}
          </View>

          {errorMessage ? (
            <Text style={[styles.errorText, { color: theme.colors.statusError }]}>{errorMessage}</Text>
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
                        style={[
                          styles.keyButton,
                          {
                            backgroundColor: theme.colors.surfaceSubtle,
                            borderColor: theme.colors.borderLight,
                          },
                        ]}
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
                      style={[
                        styles.keyButton,
                        {
                          backgroundColor: theme.colors.surfaceSubtle,
                          borderColor: theme.colors.borderLight,
                        },
                      ]}
                      onPress={() => handleKeyPress(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.keyText, { color: theme.colors.textPrimary }]}>{item}</Text>
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
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
    borderWidth: 1,
    marginBottom: 32,
  },
  biometricIcon: {
    marginRight: 8,
  },
  biometricButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  pinSection: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 280,
  },
  pinLabel: {
    fontSize: 11,
    marginBottom: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    marginHorizontal: 12,
  },
  dotFilled: {
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: 11,
    height: 20,
    textAlign: 'center',
  },
  keypad: {
    width: '100%',
    marginTop: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  keyButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  keyButtonEmpty: {
    width: 64,
    height: 64,
  },
  keyText: {
    fontSize: 22,
    fontWeight: '600',
  },
});
