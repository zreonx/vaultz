import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useOfflineSync } from "@/context/OfflineSyncContext";
import { useAuth } from "@/context/AuthContext";
import { useTutorial } from "@/context/TutorialContext";
import { useTheme } from "@/context/ThemeContext";
import { AccountPickerModal } from "./AccountPickerModal";
import { CreateAccountModal } from "./CreateAccountModal";
import { PressableScale } from "@/components/ui/PressableScale";
import { typography, radius, spacing } from "@/theme/tokens";
import { haptics } from "@/utils/haptics";

interface HeaderProps {
  title?: string;
  showAccountPicker?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showAccountPicker = true,
}) => {
  const navigation = useNavigation<any>();
  const {
    activeWorkspace,
    hideBalance,
    toggleHideBalance,
    unreadNotificationsCount,
  } = useWorkspace();
  const { pendingCount, isSyncing, syncQueue } = useOfflineSync();
  const { user } = useAuth();
  const { registerTargetRect } = useTutorial();
  const { colors, isDark } = useTheme();
  const [accountPickerVisible, setAccountPickerVisible] = useState(false);
  const [createAccountVisible, setCreateAccountVisible] = useState(false);
  const pillRef = React.useRef<any>(null);

  const handlePillLayout = () => {
    pillRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      if (width > 0 && height > 0) {
        registerTargetRect("workspace_pill", { x, y, width, height });
      }
    });
  };

  const handleToggleHide = () => {
    haptics.light();
    toggleHideBalance();
  };

  const getInitials = (email?: string, name?: string) => {
    if (name) {
      return name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "VZ";
  };

  return (
    <>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.borderSubtle,
          },
        ]}
      >
        {/* Left Side: App Brand / Title / Account Switcher */}
        <View style={styles.leftContainer}>
          <Text style={[styles.brandTitle, { color: colors.accent }]}>VAULTZ</Text>
          {showAccountPicker && (
            <View ref={pillRef} onLayout={handlePillLayout}>
              <PressableScale
                style={[
                  styles.workspacePill,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                    borderColor: colors.borderSubtle,
                  },
                ]}
                onPress={() => {
                  haptics.light();
                  setAccountPickerVisible(true);
                }}
                accessibilityLabel="Switch financial account"
              >
                <View style={[styles.statusDot, { backgroundColor: colors.accent }]} />
                <Text
                  style={[styles.workspaceName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {activeWorkspace?.name || "Select Account"}
                </Text>
                <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
              </PressableScale>
            </View>
          )}
          {title && !showAccountPicker && (
            <Text style={[styles.screenTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>

        {/* Right Side: Pending sync pill + Notifications Bell + Privacy eye + Settings Avatar */}
        <View style={styles.rightContainer}>
          {pendingCount > 0 && (
            <TouchableOpacity
              style={[
                styles.headerSyncPill,
                {
                  backgroundColor: colors.warningSoft,
                  borderColor: isDark ? colors.borderSubtle : colors.warning,
                },
              ]}
              onPress={() => {
                haptics.light();
                void syncQueue();
              }}
              disabled={isSyncing}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isSyncing ? "sync" : "cloud-upload-outline"}
                size={13}
                color={colors.warning}
              />
              <Text style={[styles.headerSyncText, { color: colors.warning }]}>
                {pendingCount}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              haptics.light();
              navigation.navigate("Notifications");
            }}
            accessibilityLabel="Notifications"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={unreadNotificationsCount > 0 ? "notifications" : "notifications-outline"}
              size={20}
              color={unreadNotificationsCount > 0 ? colors.accent : colors.textSecondary}
            />
            {unreadNotificationsCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.danger }]}>
                <Text style={styles.unreadBadgeText}>
                  {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleToggleHide}
            accessibilityLabel={hideBalance ? "Show balances" : "Hide balances"}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={hideBalance ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={hideBalance ? colors.accent : colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              haptics.light();
              navigation.navigate("Settings");
            }}
            accessibilityLabel="Account settings"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={[
              styles.avatar,
              {
                backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.textPrimary }]}>
              {getInitials(user?.email, user?.fullName)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <AccountPickerModal
        visible={accountPickerVisible}
        onClose={() => setAccountPickerVisible(false)}
        onOpenCreateAccount={() => setCreateAccountVisible(true)}
      />

      <CreateAccountModal
        visible={createAccountVisible}
        onClose={() => setCreateAccountVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: spacing.sm,
  },
  brandTitle: {
    ...typography.label,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    marginRight: spacing.sm,
  },
  workspacePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    minHeight: 32,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 180,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  workspaceName: {
    ...typography.caption,
    fontWeight: "600",
    marginRight: 4,
    maxWidth: 120,
    fontSize: 12,
  },
  screenTitle: {
    ...typography.title,
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 2,
    flexShrink: 1,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  headerSyncPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerSyncText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "700",
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  unreadBadge: {
    position: "absolute",
    top: 3,
    right: 2,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.caption,
    fontWeight: "700",
    fontSize: 11,
  },
});
