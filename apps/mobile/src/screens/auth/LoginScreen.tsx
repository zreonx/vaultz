import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { typography, radius, spacing } from "@/theme/tokens";
import { haptics } from "@/utils/haptics";

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login, verifyTwoFactor } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Two-Factor Verification state
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<{
    email: string;
    twoFactorType?: string | null;
    twoFactorToken: string;
  } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [isRecoveryCode, setIsRecoveryCode] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Email and password are required");
      haptics.error();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await login(email.trim(), password);
      if (result.requiresTwoFactor && result.twoFactorToken) {
        haptics.selection();
        setTwoFactorChallenge({
          email: email.trim(),
          twoFactorType: result.twoFactorType,
          twoFactorToken: result.twoFactorToken,
        });
        setTwoFactorCode("");
        setIsRecoveryCode(false);
        return;
      }
      haptics.success();
    } catch (err: any) {
      haptics.error();
      setError(err?.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    if (!twoFactorChallenge) return;
    if (!twoFactorCode.trim()) {
      setError("Please enter your verification code");
      haptics.error();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await verifyTwoFactor(
        twoFactorChallenge.email,
        twoFactorCode.trim(),
        twoFactorChallenge.twoFactorToken,
        isRecoveryCode
      );
      haptics.success();
    } catch (err: any) {
      haptics.error();
      setError(err?.message || "Invalid verification code");
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
          <Text style={[styles.brandName, { color: colors.textPrimary }]}>
            VAULTZ
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Personal Finance, Uncompromisingly Secure
          </Text>
        </View>

        <View
          style={[
            styles.formContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          {twoFactorChallenge ? (
            <>
              <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
                Two-Factor Verification
              </Text>
              <Text style={[styles.helperCopy, { color: colors.textMuted }]}>
                {twoFactorChallenge.twoFactorType === "Email"
                  ? `Enter the 6-digit security code sent to ${twoFactorChallenge.email}.`
                  : "Enter the 6-digit code from your authenticator app or a recovery code."}
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
                  <Text style={[styles.errorText, { color: colors.danger }]}>
                    {error}
                  </Text>
                </View>
              )}

              <Input
                label={isRecoveryCode ? "Recovery Code" : "6-Digit Code"}
                placeholder={isRecoveryCode ? "XXXX-XXXX" : "000000"}
                value={twoFactorCode}
                onChangeText={(val) => {
                  setTwoFactorCode(val);
                  if (error) setError(null);
                }}
                keyboardType={isRecoveryCode ? "default" : "number-pad"}
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon="shield-checkmark-outline"
              />

              <TouchableOpacity
                onPress={() => {
                  haptics.selection();
                  setIsRecoveryCode((v) => !v);
                  setTwoFactorCode("");
                  setError(null);
                }}
                style={styles.recoveryToggle}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.switchAction, { color: colors.accent }]}>
                  {isRecoveryCode
                    ? "Use 6-digit verification code instead"
                    : "Use a recovery code instead"}
                </Text>
              </TouchableOpacity>

              <Button
                title="Verify & Sign In"
                onPress={handleVerifyTwoFactor}
                isLoading={isLoading}
                style={styles.loginButton}
              />

              <Button
                title="Back to Sign In"
                variant="ghost"
                onPress={() => {
                  haptics.light();
                  setTwoFactorChallenge(null);
                  setError(null);
                }}
                disabled={isLoading}
                style={styles.demoButton}
              />
            </>
          ) : (
            <>
              <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
                Sign In
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
                  <Text style={[styles.errorText, { color: colors.danger }]}>
                    {error}
                  </Text>
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
                  setEmail("demo@vaultz.local");
                  setPassword("Password123");
                  if (error) setError(null);
                }}
                style={styles.demoButton}
              />

              <View style={styles.switchRow}>
                <Text
                  style={[styles.switchText, { color: colors.textSecondary }]}
                >
                  Don't have an account?{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    haptics.light();
                    navigation.navigate("Register");
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.switchAction, { color: colors.accent }]}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  logoMarkText: {
    ...typography.display,
    fontSize: 28,
    fontWeight: "800",
  },
  brandName: {
    ...typography.heading,
    letterSpacing: 2,
    fontWeight: "800",
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
    marginBottom: spacing.md,
    fontSize: 18,
  },
  helperCopy: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  errorBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    textAlign: "center",
    fontWeight: "500",
  },
  recoveryToggle: {
    alignSelf: "flex-end",
    marginBottom: spacing.md,
  },
  loginButton: {
    marginTop: spacing.xs,
  },
  demoButton: {
    marginTop: spacing.sm,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  switchText: {
    ...typography.body,
    fontSize: 13,
  },
  switchAction: {
    ...typography.body,
    fontWeight: "700",
    fontSize: 13,
  },
});
