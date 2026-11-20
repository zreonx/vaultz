import React, { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { StackHeader } from "@/components/shared/StackHeader";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useOfflineSync } from "@/context/OfflineSyncContext";
import { useTutorial } from "@/context/TutorialContext";
import { useTheme, type ThemeMode } from "@/context/ThemeContext";
import { authApi } from "@/api/auth";
import {
  getApiBaseUrl,
  resetApiBaseUrl,
  setApiBaseUrl,
} from "@/api/client";
import { SUPPORTED_CURRENCIES, SupportedCurrencyCode } from "@/utils/currency";
import { radius, spacing, typography } from "@/theme/tokens";
import { haptics } from "@/utils/haptics";

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    user,
    applyAuthResult,
    isBiometricEnabled,
    setBiometricEnabled,
    logout,
  } = useAuth();
  const {
    hideBalance,
    toggleHideBalance,
    unreadNotificationsCount,
    refetchAll,
  } = useWorkspace();
  const {
    pendingCount,
    isSyncing,
    isOnline,
    lastSyncAt,
    syncQueue,
    checkConnectivity,
  } = useOfflineSync();
  const { resetTour } = useTutorial();
  const { themeMode, setThemeMode, colors, isDark } = useTheme();

  const [isUpdatingBio, setIsUpdatingBio] = useState(false);

  // Edit profile modal
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [fullNameInput, setFullNameInput] = useState("");
  const [defaultCurrencyInput, setDefaultCurrencyInput] =
    useState<SupportedCurrencyCode>("USD");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Change password modal
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // API Endpoint modal
  const [apiModalVisible, setApiModalVisible] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(getApiBaseUrl());
  const [currentApiUrl, setCurrentApiUrl] = useState(getApiBaseUrl());

  useFocusEffect(
    useCallback(() => {
      setCurrentApiUrl(getApiBaseUrl());
      void checkConnectivity();
    }, [checkConnectivity])
  );

  const initials = (user?.fullName || user?.email || "VZ")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleBiometricToggle = async (value: boolean) => {
    try {
      setIsUpdatingBio(true);
      haptics.selection();
      const success = await setBiometricEnabled(value);
      if (!success && value) {
        Alert.alert(
          "Biometrics Unavailable",
          "Biometric hardware is not enrolled or supported on this device."
        );
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to update biometric setting.");
    } finally {
      setIsUpdatingBio(false);
    }
  };

  const openProfileModal = () => {
    haptics.light();
    setFullNameInput(user?.fullName || "");
    setDefaultCurrencyInput(
      ((user?.defaultCurrencyCode || "USD").toUpperCase() as SupportedCurrencyCode)
    );
    setProfileModalVisible(true);
  };

  const handleSaveProfile = async () => {
    const trimmed = fullNameInput.trim();
    if (trimmed.length < 2) {
      Alert.alert("Invalid Name", "Please enter your full name (at least 2 characters).");
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await authApi.updateProfile(trimmed, defaultCurrencyInput);
      await applyAuthResult(updated);
      await refetchAll();
      haptics.success();
      setProfileModalVisible(false);
    } catch (err: any) {
      Alert.alert("Update Failed", err?.message || "Unable to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const openPasswordModal = () => {
    haptics.light();
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordModalVisible(true);
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert("Current Password Required", "Enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Weak Password", "New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "New password and confirmation do not match.");
      return;
    }

    setIsSavingPassword(true);
    try {
      const updated = await authApi.changePassword(currentPassword, newPassword);
      await applyAuthResult(updated);
      haptics.success();
      setPasswordModalVisible(false);
      Alert.alert("Password Updated", "Your password has been changed securely.");
    } catch (err: any) {
      Alert.alert(
        "Change Password Failed",
        err?.message || "Verify your current password and try again."
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  const openApiModal = () => {
    haptics.light();
    setApiUrlInput(getApiBaseUrl());
    setApiModalVisible(true);
  };

  const handleSaveApiUrl = async () => {
    const cleaned = apiUrlInput.trim().replace(/\/+$/, "");
    if (!/^https?:\/\/.+/i.test(cleaned)) {
      Alert.alert(
        "Invalid URL",
        "Enter a valid http:// or https:// server address."
      );
      return;
    }
    await setApiBaseUrl(cleaned);
    const updated = getApiBaseUrl();
    setCurrentApiUrl(updated);
    setApiModalVisible(false);
    const ok = await checkConnectivity();
    Alert.alert(
      "Endpoint Updated",
      ok
        ? `Connected to ${updated}`
        : `Saved ${updated}. Health check did not respond yet.`
    );
  };

  const handleResetApiUrl = async () => {
    await resetApiBaseUrl();
    const updated = getApiBaseUrl();
    setCurrentApiUrl(updated);
    setApiUrlInput(updated);
    setApiModalVisible(false);
    await checkConnectivity();
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out from Vaultz?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          haptics.medium();
          void logout();
        },
      },
    ]);
  };

  const handleRestartTour = () => {
    haptics.light();
    resetTour();
    navigation.navigate("MainTabs", { screen: "Dashboard" });
  };

  const handleSyncNow = async () => {
    haptics.light();
    const result = await syncQueue();
    await refetchAll();
    if (result.failed > 0) {
      Alert.alert(
        "Partial Sync",
        `${result.synced} synced, ${result.failed} could not sync yet.`
      );
    } else if (result.synced > 0) {
      Alert.alert("Sync Complete", `${result.synced} offline transaction(s) synced.`);
    }
  };

  return (
    <ScreenWrapper>
      <StackHeader title="Settings & Security" showPrivacyToggle={false} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
        {/* Profile Header Card */}
        <Card onPress={openProfileModal} style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: isDark ? colors.surfaceSubtle : colors.accentSoft,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <Text style={[styles.avatarText, { color: colors.accent }]}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: colors.textPrimary }]} numberOfLines={1}>
                {user?.fullName || "Vaultz User"}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.textMuted }]} numberOfLines={1}>
                {user?.email || ""}
              </Text>
              <View style={styles.profileMetaRow}>
                <Badge
                  label={`Default: ${user?.defaultCurrencyCode || "USD"}`}
                  variant="outline"
                />
                <Text style={[styles.editHint, { color: colors.accent }]}>
                  Edit Profile
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
          </View>
        </Card>

        {/* Appearance & Privacy */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          APPEARANCE & PRIVACY
        </Text>
        <Card style={styles.groupCard}>
          <View
            style={[
              styles.themeSection,
              {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.borderSubtle,
              },
            ]}
          >
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Theme</Text>
            <View
              style={[
                styles.themeSegment,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
              ]}
            >
              {(["light", "dark", "system"] as ThemeMode[]).map((mode) => {
                const active = themeMode === mode;
                const label =
                  mode === "light" ? "Light" : mode === "dark" ? "Dark" : "System";
                return (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => void setThemeMode(mode)}
                    style={[
                      styles.themeBtn,
                      active && { backgroundColor: colors.surface },
                    ]}
                  >
                    <Text
                      style={[
                        styles.themeBtnText,
                        { color: active ? colors.textPrimary : colors.textMuted },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="eye-off-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                  Mask Balances
                </Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                  Hide monetary figures across the app
                </Text>
              </View>
            </View>
            <Switch
              value={hideBalance}
              onValueChange={() => {
                haptics.selection();
                toggleHideBalance();
              }}
              trackColor={{ false: colors.border, true: colors.accent }}
            />
          </View>
        </Card>

        {/* Security */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SECURITY</Text>
        <Card style={styles.groupCard}>
          <View
            style={[
              styles.switchRow,
              {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="finger-print-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                  Biometric App Lock
                </Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                  Require Face ID / Fingerprint on launch
                </Text>
              </View>
            </View>
            <Switch
              value={isBiometricEnabled}
              disabled={isUpdatingBio}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: colors.border, true: colors.accent }}
            />
          </View>

          <TouchableOpacity
            onPress={openPasswordModal}
            style={[
              styles.navRow,
              {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="key-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                  Change Password
                </Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                  Update your sign-in credentials
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
          </TouchableOpacity>

          <View style={styles.navRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                  Two-Factor Authentication
                </Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                  {user?.twoFactorEnabled
                    ? `Active (${user?.twoFactorType || "Authenticator"})`
                    : "Configure authenticator setup in Web Security"}
                </Text>
              </View>
            </View>
            <Badge
              label={user?.twoFactorEnabled ? "Enabled" : "Off"}
              variant={user?.twoFactorEnabled ? "success" : "default"}
            />
          </View>
        </Card>

        {/* Notifications & Shortcuts */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          WORKSPACE & UTILITIES
        </Text>
        <Card style={styles.groupCard}>
          <TouchableOpacity
            onPress={() => {
              haptics.light();
              navigation.navigate("Notifications");
            }}
            style={[
              styles.navRow,
              {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                  Notifications Center
                </Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                  Review activity alerts & reminders
                </Text>
              </View>
            </View>
            {unreadNotificationsCount > 0 ? (
              <Badge
                label={`${unreadNotificationsCount} unread`}
                variant="danger"
              />
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              haptics.light();
              navigation.navigate("Tools");
            }}
            style={[
              styles.navRow,
              {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="calculator-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                  Financial Utilities & FX
                </Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                  Live currency converter & loan estimator
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleRestartTour} style={styles.navRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="compass-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                  Restart Interactive Tour
                </Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                  Replay the guided Vaultz overview
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
          </TouchableOpacity>
        </Card>

        {/* Offline & Connection */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          CONNECTIVITY & SYNC
        </Text>
        <Card style={styles.groupCard}>
          <View
            style={[
              styles.navRow,
              {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={styles.rowLeft}>
              <Ionicons
                name={isOnline === false ? "cloud-offline-outline" : "cloud-done-outline"}
                size={20}
                color={isOnline === false ? colors.warning : colors.accent}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                  {isOnline === null
                    ? "Checking Server..."
                    : isOnline
                    ? "Connected to Server"
                    : "Working Offline"}
                </Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                  {pendingCount > 0
                    ? `${pendingCount} offline transaction(s) queued`
                    : lastSyncAt
                    ? `Last synced ${lastSyncAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "All records synchronized"}
                </Text>
              </View>
            </View>
            {pendingCount > 0 ? (
              <Button
                title="Sync"
                size="sm"
                isLoading={isSyncing}
                onPress={handleSyncNow}
              />
            ) : (
              <Badge
                label={isOnline ? "Online" : isOnline === false ? "Offline" : "Checking"}
                variant={isOnline ? "success" : isOnline === false ? "warning" : "default"}
              />
            )}
          </View>

          <TouchableOpacity onPress={openApiModal} style={styles.navRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="server-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                  API Server Endpoint
                </Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={1}>
                  {currentApiUrl}
                </Text>
              </View>
            </View>
            <Ionicons name="create-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        <Button
          title="Sign Out"
          variant="danger"
          onPress={handleSignOut}
          style={styles.signOutBtn}
        />

        <Text style={[styles.versionText, { color: colors.textDisabled }]}>
          Vaultz Mobile · Multi-Currency Personal Finance
        </Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <ModalSheet
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        title="Edit Profile"
        subtitle="Update your display name and default reporting currency"
        maxHeightRatio={0.88}
        footer={
          <Button
            title="Save Profile"
            onPress={handleSaveProfile}
            isLoading={isSavingProfile}
          />
        }
      >
        <View style={styles.modalBody}>
          <Input
            label="Full Name"
            placeholder="Your full name"
            value={fullNameInput}
            onChangeText={setFullNameInput}
            containerStyle={{ marginBottom: 0 }}
          />

          <View>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Default Reporting Currency
            </Text>
            <View style={styles.currencyGrid}>
              {SUPPORTED_CURRENCIES.map((code) => {
                const selected = defaultCurrencyInput === code;
                return (
                  <TouchableOpacity
                    key={code}
                    onPress={() => {
                      haptics.light();
                      setDefaultCurrencyInput(code);
                    }}
                    style={[
                      styles.currencyChip,
                      {
                        backgroundColor: selected ? colors.accent : colors.surfaceMuted,
                        borderColor: selected ? colors.accent : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.currencyChipText,
                        { color: selected ? colors.accentForeground : colors.textPrimary },
                      ]}
                    >
                      {code}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </ModalSheet>

      {/* Change Password Modal */}
      <ModalSheet
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
        title="Change Password"
        subtitle="Choose a strong password of at least 8 characters"
        maxHeightRatio={0.85}
        footer={
          <Button
            title="Update Password"
            onPress={handleChangePassword}
            isLoading={isSavingPassword}
          />
        }
      >
        <View style={styles.modalBody}>
          <Input
            label="Current Password"
            isPassword
            placeholder="Enter current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            containerStyle={{ marginBottom: 0 }}
          />
          <Input
            label="New Password"
            isPassword
            placeholder="Minimum 8 characters"
            value={newPassword}
            onChangeText={setNewPassword}
            containerStyle={{ marginBottom: 0 }}
          />
          <Input
            label="Confirm New Password"
            isPassword
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
      </ModalSheet>

      {/* Edit API Endpoint Modal */}
      <ModalSheet
        visible={apiModalVisible}
        onClose={() => setApiModalVisible(false)}
        title="API Endpoint"
        subtitle="Point the mobile client to your Vaultz API URL"
        maxHeightRatio={0.8}
        footer={
          <View style={{ gap: spacing.sm }}>
            <Button title="Save & Test Connection" onPress={handleSaveApiUrl} />
            <Button
              title="Reset to Default"
              variant="secondary"
              onPress={handleResetApiUrl}
            />
          </View>
        }
      >
        <View style={styles.modalBody}>
          <Input
            label="Base URL"
            placeholder="http://192.168.1.10:5180"
            value={apiUrlInput}
            onChangeText={setApiUrlInput}
            autoCapitalize="none"
            autoCorrect={false}
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
      </ModalSheet>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.huge,
  },
  container: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  profileCard: {
    marginBottom: spacing.lg,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.title,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.bodyLarge,
    fontWeight: "700",
  },
  profileEmail: {
    ...typography.caption,
    marginTop: 2,
  },
  profileMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  editHint: {
    ...typography.caption,
    fontWeight: "600",
  },
  sectionLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  groupCard: {
    padding: 0,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  themeSection: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  themeSegment: {
    flexDirection: "row",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 3,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
  },
  themeBtnText: {
    ...typography.caption,
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    minHeight: 60,
    gap: spacing.md,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    minHeight: 60,
    gap: spacing.md,
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rowTitle: {
    ...typography.bodyLarge,
    fontSize: 15,
    fontWeight: "600",
  },
  rowSub: {
    ...typography.caption,
    marginTop: 2,
  },
  signOutBtn: {
    marginTop: spacing.xs,
  },
  versionText: {
    ...typography.caption,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  modalBody: {
    gap: spacing.md,
  },
  fieldLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  currencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  currencyChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  currencyChipText: {
    ...typography.caption,
    fontWeight: "700",
  },
});
