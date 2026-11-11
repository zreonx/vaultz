import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { typography, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login } = useAuth();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Email and password are required');
      haptics.error();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await login(email.trim(), password);
      haptics.success();
    } catch (err: any) {
      haptics.error();
      setError(err.message || 'Invalid email or password');
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
          <View
            style={[
              styles.logoMark,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Text style={[styles.logoMarkText, { color: colors.accent }]}>V</Text>
          </View>
          <Text style={[styles.brandName, { color: colors.textPrimary }]}>VAULTZ</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Personal Finance, Uncompromisingly Secure
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
          <Text style={[styles.formTitle, { color: colors.textPrimary }]}>Sign In</Text>

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
            label="Password"
            placeholder="••••••••••••"
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              if (error) setError(null);
            }}
            isPassword
            leftIcon="lock-closed-outline"
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            isLoading={isLoading}
            style={styles.loginButton}
          />

          <Button
            title="Fill Demo Credentials"
            variant="secondary"
            leftIcon="sparkles-outline"
            onPress={() => {
              haptics.selection();
              setEmail('demo@vaultz.local');
              setPassword('Password123');
              if (error) setError(null);
            }}
            style={styles.demoButton}
          />

          <View style={styles.switchRow}>
            <Text style={[styles.switchText, { color: colors.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity
              onPress={() => {
                haptics.light();
                navigation.navigate('Register');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.switchAction, { color: colors.accent }]}>Sign Up</Text>
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
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoMarkText: {
    ...typography.display,
    fontSize: 28,
    fontWeight: '800',
  },
  brandName: {
    ...typography.heading,
    letterSpacing: 2,
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
  formTitle: {
    ...typography.title,
    marginBottom: spacing.lg,
    fontSize: 18,
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
  loginButton: {
    marginTop: spacing.xs,
  },
  demoButton: {
    marginTop: spacing.sm,
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
