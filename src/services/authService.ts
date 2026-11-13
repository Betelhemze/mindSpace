import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { SECURE_STORE_PIN_KEY } from '@/database/constants';

export class AuthService {
  /**
   * Check if biometric hardware exists and has fingerprints/Face ID enrolled.
   */
  static async checkBiometricsAvailability(): Promise<{
    hasHardware: boolean;
    isEnrolled: boolean;
    supportedTypes: LocalAuthentication.AuthenticationType[];
  }> {
    if (Platform.OS === 'web') {
      return { hasHardware: false, isEnrolled: false, supportedTypes: [] };
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      return { hasHardware, isEnrolled, supportedTypes };
    } catch (err) {
      console.warn('[AuthService] Biometrics check error:', err);
      return { hasHardware: false, isEnrolled: false, supportedTypes: [] };
    }
  }

  /**
   * Prompt biometric authentication with graceful fallback.
   */
  static async promptBiometricAuth(promptTitle: string = 'Unlock Mindspace'): Promise<boolean> {
    if (Platform.OS === 'web') return true;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptTitle,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (err) {
      console.error('[AuthService] Biometric prompt failed:', err);
      return false;
    }
  }

  /**
   * Save a user PIN securely in SecureStore hashed with SHA-256.
   */
  static async setPin(rawPin: string): Promise<void> {
    if (rawPin.length < 4) {
      throw new Error('PIN must be at least 4 digits');
    }
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `mindspace_salt_${rawPin}`
    );

    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync(SECURE_STORE_PIN_KEY, hash, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    }
  }

  /**
   * Verify if entered PIN matches the securely stored hash.
   */
  static async verifyPin(enteredPin: string): Promise<boolean> {
    if (Platform.OS === 'web') return true;

    const storedHash = await SecureStore.getItemAsync(SECURE_STORE_PIN_KEY);
    if (!storedHash) {
      return false;
    }

    const enteredHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `mindspace_salt_${enteredPin}`
    );

    return storedHash === enteredHash;
  }

  /**
   * Remove stored PIN.
   */
  static async removePin(): Promise<void> {
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(SECURE_STORE_PIN_KEY);
    }
  }

  /**
   * Check if a PIN is currently configured.
   */
  static async hasPin(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const stored = await SecureStore.getItemAsync(SECURE_STORE_PIN_KEY);
    return Boolean(stored);
  }
}

