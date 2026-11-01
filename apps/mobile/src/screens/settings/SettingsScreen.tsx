import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getApiBaseUrl } from '@/api/client';
import { colors } from '@/theme/colors';
import { typography, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

export const SettingsScreen: React.FC = () => {
  const { user, isBiometricEnabled, setBiometricEnabled, logout } = useAuth();
  const { hideBalance, toggleHideBalance } = useWorkspace();
  const [isUpdatingBio, setIsUpdatingBio] = useState(false);

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
        <Card style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user?.fullName?.slice(0, 2).toUpperCase() ||
                user?.email?.slice(0, 2).toUpperCase() ||
                'VZ'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.fullName || 'Vaultz User'}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          <Badge label="Authenticated" variant="success" />
        </Card>

        {/* Security Section */}
        <Text style={styles.sectionTitle}>SECURITY & PRIVACY</Text>
        <Card style={styles.settingGroup}>
          {/* Biometrics */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="finger-print-outline" size={20} color={colors.accent} />
              </View>
              <View style={styles.settingLabels}>
                <Text style={styles.settingTitle}>Biometric Lock</Text>
                <Text style={styles.settingSubtitle}>
                  Require FaceID / TouchID to unlock app
                </Text>
              </View>
            </View>
            <Switch
              value={isBiometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={isUpdatingBio}
              thumbColor={isBiometricEnabled ? colors.accent : colors.textMuted}
              trackColor={{
                false: colors.surfaceHover,
                true: 'rgba(16, 185, 129, 0.4)',
              }}
            />
          </View>

          <View style={styles.divider} />

          {/* Hide Balances */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons
                  name={hideBalance ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.accent}
                />
              </View>
              <View style={styles.settingLabels}>
                <Text style={styles.settingTitle}>Privacy Masking</Text>
                <Text style={styles.settingSubtitle}>
                  Obscure monetary values by default
                </Text>
              </View>
            </View>
            <Switch
              value={hideBalance}
              onValueChange={() => {
                haptics.selection();
                toggleHideBalance();
              }}
              thumbColor={hideBalance ? colors.accent : colors.textMuted}
              trackColor={{
                false: colors.surfaceHover,
                true: 'rgba(16, 185, 129, 0.4)',
              }}
            />
          </View>
        </Card>

        {/* Network & Infrastructure Section */}
        <Text style={styles.sectionTitle}>SYSTEM & INFRASTRUCTURE</Text>
        <Card style={styles.settingGroup}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="server-outline" size={20} color="#60A5FA" />
              </View>
              <View style={styles.settingLabels}>
                <Text style={styles.settingTitle}>API Backend Host</Text>
                <Text style={styles.settingSubtitle}>{getApiBaseUrl()}</Text>
              </View>
            </View>
            <Badge label="Online" variant="success" />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="flash-outline" size={20} color={colors.warning} />
              </View>
              <View style={styles.settingLabels}>
                <Text style={styles.settingTitle}>JavaScript Engine</Text>
                <Text style={styles.settingSubtitle}>Hermes (High performance)</Text>
              </View>
            </View>
            <Badge label="Active" variant="info" />
          </View>
        </Card>

        {/* Sign Out Button */}
        <Button
          title="Sign Out of Vaultz"
          variant="danger"
          leftIcon="log-out-outline"
          onPress={handleSignOut}
          style={styles.signOutButton}
        />

        <Text style={styles.versionText}>Vaultz Mobile v1.0.0 • Strict Multi-Tenant Isolation</Text>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  profileAvatarText: {
    ...typography.title,
    fontSize: 16,
    color: colors.textPrimary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.title,
    fontSize: 16,
    color: colors.textPrimary,
  },
  profileEmail: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.label,
    letterSpacing: 1,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginLeft: 2,
  },
  settingGroup: {
    marginBottom: spacing.xl,
    padding: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
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
    backgroundColor: colors.surfaceHover,
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
    color: colors.textPrimary,
  },
  settingSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  signOutButton: {
    marginTop: spacing.sm,
  },
  versionText: {
    ...typography.caption,
    color: colors.textDisabled,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
