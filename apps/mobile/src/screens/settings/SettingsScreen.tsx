import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useTutorial } from '@/context/TutorialContext';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { getApiBaseUrl } from '@/api/client';
import { typography, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, isBiometricEnabled, setBiometricEnabled, logout } = useAuth();
  const { hideBalance, toggleHideBalance } = useWorkspace();
  const { resetTour } = useTutorial();
  const { themeMode, setThemeMode, colors, isDark } = useTheme();
  const [isUpdatingBio, setIsUpdatingBio] = useState(false);
  const [notifyBudget, setNotifyBudget] = useState(true);
  const [notifyIou, setNotifyIou] = useState(true);
  const [notifyTransactions, setNotifyTransactions] = useState(false);

  const handleBiometricToggle = async (value: boolean) => {
    try {
      setIsUpdatingBio(true);
      haptics.selection();
      const success = await setBiometricEnabled(value);
      if (!success && value) {
        Alert.alert(
          'Biometrics Unavailable',
          'Biometric hardware is not enrolled or supported on this device.'
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update biometric setting');
    } finally {
      setIsUpdatingBio(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out from Vaultz?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          haptics.medium();
          logout();
        },
      },
    ]);
  };

  return (
    <ScreenWrapper>
      <Header showAccountPicker={false} title="Settings" />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <Card
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.profileAvatar,
              {
                backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.profileAvatarText, { color: colors.textPrimary }]}>
              {user?.fullName?.slice(0, 2).toUpperCase() ||
                user?.email?.slice(0, 2).toUpperCase() ||
                'VZ'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>
              {user?.fullName || 'Vaultz User'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.textMuted }]}>
              {user?.email}
            </Text>
          </View>
          <Badge label="Active" variant="success" />
        </Card>

        {/* Appearance & Theme Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          APPEARANCE & THEME
        </Text>
        <Card
          style={[
            styles.settingGroup,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.themeRow}>
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.settingIcon,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                  },
                ]}
              >
                <Ionicons
                  name={isDark ? 'moon-outline' : 'sunny-outline'}
                  size={20}
                  color={colors.accent}
                />
              </View>
              <View style={styles.settingLabels}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  App Theme
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
                  Warm linen light, deep graphite dark
                </Text>
              </View>
            </View>
          </View>

          {/* Segmented Theme Picker */}
          <View
            style={[
              styles.themeSegmentContainer,
              {
                backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
          >
            {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => {
              const isActive = themeMode === mode;
              const modeLabel =
                mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System';
              const modeIcon =
                mode === 'light'
                  ? 'sunny-outline'
                  : mode === 'dark'
                  ? 'moon-outline'
                  : 'phone-portrait-outline';

              return (
                <PressableScale
                  key={mode}
                  style={[
                    styles.themeSegmentBtn,
                    isActive && [
                      styles.themeSegmentActive,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        shadowColor: '#000',
                      },
                    ],
                  ]}
                  onPress={() => {
                    haptics.selection();
                    setThemeMode(mode);
                  }}
                >
                  <Ionicons
                    name={modeIcon}
                    size={15}
                    color={isActive ? colors.accent : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.themeSegmentText,
                      {
                        color: isActive ? colors.accent : colors.textSecondary,
                        fontWeight: isActive ? '700' : '500',
                      },
                    ]}
                  >
                    {modeLabel}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </Card>

        {/* Security & Preferences */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          SECURITY & PRIVACY
        </Text>
        <Card
          style={[
            styles.settingGroup,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Biometrics */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.settingIcon,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                  },
                ]}
              >
                <Ionicons name="finger-print-outline" size={20} color={colors.accent} />
              </View>
              <View style={styles.settingLabels}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  Biometric Lock
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
                  Require FaceID or Fingerprint on app launch
                </Text>
              </View>
            </View>
            <Switch
              value={isBiometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={isUpdatingBio}
              trackColor={{ false: colors.border, true: colors.accentMuted }}
              thumbColor={isBiometricEnabled ? colors.accent : colors.surface}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Privacy Mask */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.settingIcon,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                  },
                ]}
              >
                <Ionicons
                  name={hideBalance ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.accent}
                />
              </View>
              <View style={styles.settingLabels}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  Mask Balances
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
                  Hide account amounts in public spaces
                </Text>
              </View>
            </View>
            <Switch
              value={hideBalance}
              onValueChange={() => {
                haptics.selection();
                toggleHideBalance();
              }}
              trackColor={{ false: colors.border, true: colors.accentMuted }}
              thumbColor={hideBalance ? colors.accent : colors.surface}
            />
          </View>
        </Card>

        {/* Notification Preferences */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          NOTIFICATIONS
        </Text>
        <Card
          style={[
            styles.settingGroup,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Budget Alerts */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.settingIcon,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                  },
                ]}
              >
                <Ionicons name="notifications-outline" size={20} color={colors.accent} />
              </View>
              <View style={styles.settingLabels}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  Budget Warnings
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
                  Alert when spending reaches 80% and 100%
                </Text>
              </View>
            </View>
            <Switch
              value={notifyBudget}
              onValueChange={(val) => {
                haptics.selection();
                setNotifyBudget(val);
              }}
              trackColor={{ false: colors.border, true: colors.accentMuted }}
              thumbColor={notifyBudget ? colors.accent : colors.surface}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* IOU Reminders */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.settingIcon,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                  },
                ]}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.accent} />
              </View>
              <View style={styles.settingLabels}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  IOU Due Date Reminders
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
                  Scheduled notifications for lent or borrowed funds
                </Text>
              </View>
            </View>
            <Switch
              value={notifyIou}
              onValueChange={(val) => {
                haptics.selection();
                setNotifyIou(val);
              }}
              trackColor={{ false: colors.border, true: colors.accentMuted }}
              thumbColor={notifyIou ? colors.accent : colors.surface}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Transaction Activity Alerts */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.settingIcon,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                  },
                ]}
              >
                <Ionicons name="receipt-outline" size={20} color={colors.accent} />
              </View>
              <View style={styles.settingLabels}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  Transaction Confirmations
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
                  Push alert for each newly recorded entry
                </Text>
              </View>
            </View>
            <Switch
              value={notifyTransactions}
              onValueChange={(val) => {
                haptics.selection();
                setNotifyTransactions(val);
              }}
              trackColor={{ false: colors.border, true: colors.accentMuted }}
              thumbColor={notifyTransactions ? colors.accent : colors.surface}
            />
          </View>
        </Card>

        {/* Financial Utilities */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          FINANCIAL UTILITIES
        </Text>
        <Card
          style={[
            styles.settingGroup,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.settingIcon,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                  },
                ]}
              >
                <Ionicons name="calculator-outline" size={20} color={colors.accent} />
              </View>
              <View style={styles.settingLabels}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  Calculators & Tools
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
                  FX converter, standard calculator, loan & savings projections
                </Text>
              </View>
            </View>
            <Button
              title="Open"
              variant="secondary"
              size="sm"
              onPress={() => {
                haptics.selection();
                navigation.navigate('Tools');
              }}
            />
          </View>
        </Card>

        {/* Guided Tour Reset */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          HELP & ONBOARDING
        </Text>
        <Card
          style={[
            styles.settingGroup,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.settingIcon,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                  },
                ]}
              >
                <Ionicons name="sparkles-outline" size={20} color={colors.accent} />
              </View>
              <View style={styles.settingLabels}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  Restart Interactive Tour
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
                  Re-run the guided product walkthrough
                </Text>
              </View>
            </View>
            <Button
              title="Start"
              variant="secondary"
              size="sm"
              onPress={() => {
                haptics.success();
                resetTour();
                Alert.alert(
                  'Tour Reset',
                  'Return to the Dashboard tab to experience the guided spotlight walkthrough.'
                );
              }}
            />
          </View>
        </Card>

        {/* Environment Info */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          SYSTEM INFO
        </Text>
        <Card
          style={[
            styles.settingGroup,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.settingIcon,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                  },
                ]}
              >
                <Ionicons name="server-outline" size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.settingLabels}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  API Endpoint
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
                  {getApiBaseUrl()}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Sign Out Button */}
        <Button
          title="Sign Out"
          variant="danger"
          leftIcon="log-out-outline"
          onPress={handleSignOut}
          style={styles.signOutButton}
        />

        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          Vaultz Mobile • v1.0.0
        </Text>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: spacing.base,
    paddingBottom: spacing.xxl * 2,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
    padding: spacing.base,
    borderRadius: radius.lg,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  profileAvatarText: {
    ...typography.title,
    fontSize: 16,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.title,
    fontSize: 16,
    fontWeight: '600',
  },
  profileEmail: {
    ...typography.caption,
    marginTop: 2,
    fontSize: 12,
  },
  sectionTitle: {
    ...typography.label,
    letterSpacing: 0.8,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 2,
  },
  settingGroup: {
    marginBottom: spacing.lg,
    padding: spacing.base,
    borderRadius: radius.lg,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  themeSegmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  themeSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radius.md,
    gap: 5,
  },
  themeSegmentActive: {
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  themeSegmentText: {
    ...typography.caption,
    fontSize: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingLabels: {
    flex: 1,
  },
  settingTitle: {
    ...typography.body,
    fontWeight: '600',
    fontSize: 14,
  },
  settingSubtitle: {
    ...typography.caption,
    marginTop: 2,
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  signOutButton: {
    marginTop: spacing.sm,
  },
  versionText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: 11,
  },
});
