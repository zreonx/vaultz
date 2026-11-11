import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { typography, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

interface RegisterScreenProps {
  navigation: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { register } = useAuth();
  const { colors, isDark } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!email.trim() || !password) {
      setError('Email and password are required');
      haptics.error();
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      haptics.error();
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      haptics.error();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await register(email.trim(), password, fullName.trim() || undefined);
      haptics.success();
    } catch (err: any) {
      haptics.error();
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper includeBottomInset>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand / Logo Area */}
        <View style={styles.brandContainer}>
          <Text style={[styles.brandName, { color: colors.textPrimary }]}>CREATE ACCOUNT</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Start tracking personal finances with isolation
          </Text>
        </View>

        {/* Form Card */}
        <View
          style={[
            styles.formContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
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

          <Input
            label="Full Name (Optional)"
            placeholder="Jane Doe"
            value={fullName}
            onChangeText={(val) => {
              setFullName(val);
              if (error) setError(null);
            }}
            leftIcon="person-outline"
          />

          <Input
            label="Email Address"
            placeholder="you@domain.com"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (error) setError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon="mail-outline"
          />

          <Input
            label="Password (min. 8 chars)"
            placeholder="••••••••••••"
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              if (error) setError(null);
            }}
            isPassword
            leftIcon="lock-closed-outline"
          />

          <Input
            label="Confirm Password"
            placeholder="••••••••••••"
            value={confirmPassword}
            onChangeText={(val) => {
              setConfirmPassword(val);
              if (error) setError(null);
            }}
            isPassword
            leftIcon="lock-closed-outline"
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            isLoading={isLoading}
            style={styles.registerButton}
          />

          <View style={styles.switchRow}>
            <Text style={[styles.switchText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity
              onPress={() => {
                haptics.light();
                navigation.navigate('Login');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.switchAction, { color: colors.accent }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  brandName: {
    ...typography.heading,
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
    fontSize: 12,
  },
  formContainer: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  errorBox: {
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
  registerButton: {
    marginTop: spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  switchText: {
    ...typography.body,
    fontSize: 13,
  },
  switchAction: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 13,
  },
});
