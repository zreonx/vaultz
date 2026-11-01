import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { colors } from '@/theme/colors';
import { typography, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

export const BiometricLockScreen: React.FC = () => {
  const { unlockWithBiometrics, logout, user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const attemptUnlock = async () => {
    setError(null);
    const success = await unlockWithBiometrics();
    if (!success) {
      setError('Biometric authentication failed or was cancelled');
    }
  };

  useEffect(() => {
    // Attempt biometric unlock immediately when screen loads
    attemptUnlock();
  }, []);

  return (
    <ScreenWrapper includeBottomInset>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={44} color={colors.accent} />
          </View>

          <Text style={styles.title}>Vaultz is Locked</Text>
          <Text style={styles.subtitle}>
            Welcome back, {user?.fullName || user?.email || 'User'}. Confirm your identity to unlock.
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button
            title="Unlock with Biometrics"
            variant="primary"
            leftIcon="finger-print-outline"
            onPress={attemptUnlock}
            style={styles.unlockButton}
          />

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              haptics.medium();
              logout();
            }}
          >
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xxl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  errorBox: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'center',
  },
  unlockButton: {
    width: '100%',
    marginBottom: spacing.md,
  },
  logoutButton: {
    padding: spacing.sm,
  },
  logoutText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
