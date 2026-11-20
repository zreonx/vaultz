import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Header } from "@/components/shared/Header";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useTheme } from "@/context/ThemeContext";
import { formatMoney } from "@/utils/currency";
import { radius, spacing, typography } from "@/theme/tokens";
import { haptics } from "@/utils/haptics";

interface MenuRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  badgeCount?: number;
  iconBg?: string;
  iconColor?: string;
  isLast?: boolean;
}

const MenuRow: React.FC<MenuRowProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  badgeCount,
  iconBg,
  iconColor,
  isLast = false,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => {
        haptics.light();
        onPress();
      }}
      activeOpacity={0.65}
      style={[
        styles.menuRow,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.borderSubtle,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: iconBg || colors.surfaceMuted },
        ]}
      >
        <Ionicons name={icon} size={20} color={iconColor || colors.accent} />
      </View>

      <View style={styles.menuLabels}>
        <Text style={[styles.menuTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.menuSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.menuRight}>
        {typeof badgeCount === "number" && badgeCount > 0 ? (
          <View style={[styles.unreadPill, { backgroundColor: colors.danger }]}>
            <Text style={[styles.unreadPillText, { color: colors.white }]}>
              {badgeCount > 99 ? "99+" : badgeCount}
            </Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
      </View>
    </TouchableOpacity>
  );
};

export const MoreScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { activeWorkspace, hideBalance, unreadNotificationsCount } = useWorkspace();
  const { colors } = useTheme();

  const initials = (user?.fullName || user?.email || "VZ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScreenWrapper>
      <Header showAccountPicker={false} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
        <View style={styles.headingBlock}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>More</Text>
          <Text style={[styles.screenSubtitle, { color: colors.textMuted }]}>
            Analytics, goals, automation, and workspace settings
          </Text>
        </View>

        {/* User Profile Card */}
        <Card
          onPress={() => {
            haptics.light();
            navigation.navigate("Settings");
          }}
          style={styles.profileCard}
        >
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
              <Text style={[styles.avatarText, { color: colors.accent }]}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.textPrimary }]} numberOfLines={1}>
                {user?.fullName || "Vaultz Member"}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                {user?.email || "Signed in"}
              </Text>
              <View style={styles.profileBadges}>
                <Badge
                  label={`Base: ${user?.defaultCurrencyCode || "USD"}`}
                  variant="outline"
                />
                {user?.twoFactorEnabled ? (
                  <Badge label="2FA Active" variant="success" />
                ) : null}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
          </View>
        </Card>

        {/* Active Account Snapshot */}
        {activeWorkspace ? (
          <Card
            variant="subtle"
            onPress={() => {
              haptics.light();
              navigation.navigate("Accounts");
            }}
            style={styles.activeAccountCard}
          >
            <View style={styles.activeAccountRow}>
              <View style={styles.activeAccountLeft}>
                <Text style={[styles.activeAccountKicker, { color: colors.textMuted }]}>
                  ACTIVE ACCOUNT
                </Text>
                <Text style={[styles.activeAccountName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {activeWorkspace.name} · {activeWorkspace.typeName}
                </Text>
              </View>
              <View style={styles.activeAccountRight}>
                <Text
                  style={[
                    styles.activeAccountBalance,
                    { color: colors.accent, fontVariant: ["tabular-nums"] },
                  ]}
                >
                  {hideBalance
                    ? "••••••"
                    : formatMoney(activeWorkspace.balance, activeWorkspace.currencyCode)}
                </Text>
                <Text style={[styles.activeAccountCurrency, { color: colors.textMuted }]}>
                  {activeWorkspace.currencyCode}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Planning & Analytics */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          PLANNING & ANALYTICS
        </Text>
        <Card style={styles.menuCard}>
          <MenuRow
            icon="pie-chart-outline"
            title="Reports & Analytics"
            subtitle="Cash flow, savings rate & category insights"
            onPress={() => navigation.navigate("Reports")}
          />
          <MenuRow
            icon="flag-outline"
            title="Savings Goals"
            subtitle="Track targets, reserves & contributions"
            onPress={() => navigation.navigate("SavingsGoals")}
          />
          <MenuRow
            icon="heart-outline"
            title="Wishlist"
            subtitle="Planned purchases & 1-tap expense logging"
            onPress={() => navigation.navigate("Wishlist")}
          />
          <MenuRow
            icon="repeat-outline"
            title="Recurring Bills & Income"
            subtitle="Scheduled transactions & quick logging"
            onPress={() => navigation.navigate("Recurring")}
          />
          <MenuRow
            icon="wallet-outline"
            title="Monthly Finance"
            subtitle="Account vaults, allocations & plans"
            onPress={() => navigation.navigate("Finance")}
            isLast
          />
        </Card>

        {/* Tracking & Organization */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          TRACKING & TOOLS
        </Text>
        <Card style={styles.menuCard}>
          <MenuRow
            icon="swap-horizontal-outline"
            title="IOUs & Lending"
            subtitle="Money lent, borrowed & repayments"
            onPress={() => navigation.navigate("Lending")}
          />
          <MenuRow
            icon="pricetags-outline"
            title="Categories"
            subtitle="Customize income & expense tags"
            onPress={() => navigation.navigate("Categories")}
          />
          <MenuRow
            icon="document-text-outline"
            title="Quick Notes"
            subtitle="Pinned financial reminders & checklists"
            onPress={() => navigation.navigate("QuickNotes")}
          />
          <MenuRow
            icon="calculator-outline"
            title="Calculators & FX Rates"
            subtitle="Live currency converter & loan estimator"
            onPress={() => navigation.navigate("Tools")}
            isLast
          />
        </Card>

        {/* Preferences & Account */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          PREFERENCES
        </Text>
        <Card style={styles.menuCard}>
          <MenuRow
            icon="notifications-outline"
            title="Notifications"
            subtitle="Activity alerts & reminders"
            badgeCount={unreadNotificationsCount}
            onPress={() => navigation.navigate("Notifications")}
          />
          <MenuRow
            icon="settings-outline"
            title="Settings & Security"
            subtitle="Profile, password, theme & offline sync"
            onPress={() => navigation.navigate("Settings")}
            isLast
          />
        </Card>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.huge,
  },
  container: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  headingBlock: {
    marginBottom: spacing.base,
  },
  screenTitle: {
    ...typography.heading,
  },
  screenSubtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  profileCard: {
    marginBottom: spacing.md,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.bodyLarge,
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
  profileBadges: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: "wrap",
  },
  activeAccountCard: {
    marginBottom: spacing.lg,
  },
  activeAccountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  activeAccountLeft: {
    flex: 1,
  },
  activeAccountKicker: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  activeAccountName: {
    ...typography.label,
    marginTop: 2,
  },
  activeAccountRight: {
    alignItems: "flex-end",
  },
  activeAccountBalance: {
    ...typography.bodyLarge,
    fontWeight: "700",
  },
  activeAccountCurrency: {
    ...typography.caption,
    fontSize: 10,
  },
  sectionLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  menuCard: {
    padding: 0,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    minHeight: 60,
    gap: spacing.md,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabels: {
    flex: 1,
  },
  menuTitle: {
    ...typography.bodyLarge,
    fontSize: 15,
    fontWeight: "600",
  },
  menuSubtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  unreadPill: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
