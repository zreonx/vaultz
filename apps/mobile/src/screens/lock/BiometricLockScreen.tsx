import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { typography, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

export const BiometricLockScreen: React.FC = () => {
  const { unlockWithBiometrics, logout, user } = useAuth();
  const { colors, isDark } = useTheme();
  const [error, setError] = useState<string | null>(null);

  const attemptUnlock = async () => {
    setError(null);
    const success = await unlockWithBiometrics();
    if (!success) {
      setError('Biometric authentication failed or was cancelled');
    }
  };

  useEffect(() => {
    attemptUnlock();
  }, []);

  return (
    <ScreenWrapper includeBottomInset>
      <View style={styles.container}>
        <View
          style={[
            styles.content,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: colors.accentMuted,
                borderColor: colors.accent,
              },
            ]}
          >
            <Ionicons name="lock-closed" size={38} color={colors.accent} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>Vaultz is Locked</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Welcome back, {user?.fullName || user?.email || 'User'}. Confirm your identity to unlock.
          </Text>

          {error && (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: colors.dangerSoft,
                  borderColor: colors.danger,
                },
              ]}
            >
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
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
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.logoutText, { color: colors.textMuted }]}>Sign Out</Text>
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
    paddingHorizontal: spacing.lg,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  title: {
    ...typography.title,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
    fontSize: 13,
  },
  errorBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    textAlign: 'center',
    fontWeight: '500',
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
    fontWeight: '600',
    fontSize: 13,
  },
});
