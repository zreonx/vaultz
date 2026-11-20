import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useTheme } from "@/context/ThemeContext";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { Header } from "@/components/shared/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PressableScale } from "@/components/ui/PressableScale";
import { FadeInView } from "@/components/ui/FadeInView";
import { CreateAccountModal } from "@/components/shared/CreateAccountModal";
import { EditAccountModal } from "@/components/shared/EditAccountModal";
import { CreateTransactionModal } from "@/screens/transactions/CreateTransactionModal";
import { typography, radius, spacing } from "@/theme/tokens";
import { formatMoney } from "@/utils/currency";
import { haptics } from "@/utils/haptics";
import { AccountDto } from "@/types/api";

export const AccountsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    accounts,
    activeWorkspace,
    setActiveWorkspace,
    hideBalance,
    refreshAccounts,
    refetchAll,
  } = useWorkspace();
  const { colors, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountDto | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    haptics.light();
    await refreshAccounts();
    setRefreshing(false);
  };

  const handleOpenEdit = (account: AccountDto) => {
    haptics.light();
    setEditingAccount(account);
    setEditModalVisible(true);
  };

  const handleSelectAccount = (account: AccountDto) => {
    haptics.selection();
    setActiveWorkspace(account);
  };

  const getAccountIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    const t = type.toLowerCase();
    if (t.includes("credit")) return "card-outline";
    if (t.includes("savings")) return "shield-outline";
    if (t.includes("cash")) return "cash-outline";
    if (t.includes("invest")) return "trending-up-outline";
    return "wallet-outline";
  };

  return (
    <ScreenWrapper>
      <Header showAccountPicker={false} title="Accounts" />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Minimalist Section Header + Action Bar */}
        <FadeInView delay={30} translateY={10}>
          <View style={styles.introContainer}>
            <View style={styles.introHeaderRow}>
              <Text style={[styles.introTitle, { color: colors.textPrimary }]}>
                Financial Accounts
              </Text>
              <Badge
                label={`${accounts.length} ${accounts.length === 1 ? "Account" : "Accounts"}`}
                variant="outline"
              />
            </View>
            <Text style={[styles.introSubtitle, { color: colors.textMuted }]}>
              Each account operates in strict isolation. Tap a card to switch your
              active workspace.
            </Text>

            <View style={styles.topActionRow}>
              {accounts.length > 1 && (
                <Button
                  title="Transfer"
                  variant="secondary"
                  size="sm"
                  leftIcon="swap-horizontal-outline"
                  onPress={() => {
                    haptics.light();
                    setTransferModalVisible(true);
                  }}
                  style={styles.topActionBtn}
                />
              )}
              <Button
                title="New Account"
                variant="primary"
                size="sm"
                leftIcon="add-outline"
                onPress={() => {
                  haptics.light();
                  setCreateModalVisible(true);
                }}
                style={styles.topActionBtn}
              />
            </View>
          </View>
        </FadeInView>

        {/* Accounts List */}
        <View style={styles.accountsList}>
          {accounts.map((acc, index) => {
            const isActive = activeWorkspace?.id === acc.id;

            return (
              <FadeInView key={acc.id} delay={60 + index * 30} translateY={10}>
                <PressableScale
                  onPress={() => handleSelectAccount(acc)}
                  style={styles.cardPressable}
                >
                  <Card
                    variant={isActive ? "active" : "surface"}
                    style={[
                      styles.accountCard,
                      isActive && {
                        backgroundColor: colors.accentSoft,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardLeft}>
                        <View
                          style={[
                            styles.iconBadge,
                            {
                              backgroundColor: isActive
                                ? colors.accentMuted
                                : isDark
                                ? colors.surfaceSubtle
                                : colors.surfaceMuted,
                            },
                          ]}
                        >
                          <Ionicons
                            name={getAccountIcon(
                              acc.typeName || String(acc.type)
                            )}
                            size={20}
                            color={
                              isActive ? colors.accent : colors.textSecondary
                            }
                          />
                        </View>
                        <View style={styles.accountTextGroup}>
                          <View style={styles.nameRow}>
                            <Text
                              style={[
                                styles.accountName,
                                {
                                  color: isActive
                                    ? colors.accent
                                    : colors.textPrimary,
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {acc.name}
                            </Text>
                            {acc.isDefault && (
                              <Badge
                                label="Default"
                                variant="outline"
                                style={styles.badge}
                              />
                            )}
                          </View>
                          <Text
                            style={[
                              styles.accountType,
                              { color: colors.textMuted },
                            ]}
                          >
                            {acc.typeName || String(acc.type)} •{" "}
                            {acc.currency || acc.currencyCode}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardTopRight}>
                        {isActive && <Badge label="Active" variant="success" />}
                        <TouchableOpacity
                          onPress={() => handleOpenEdit(acc)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={[
                            styles.editIconBtn,
                            {
                              backgroundColor: isDark
                                ? colors.surfaceSubtle
                                : colors.surfaceMuted,
                              borderColor: colors.borderSubtle,
                            },
                          ]}
                          accessibilityLabel={`Edit ${acc.name}`}
                        >
                          <Ionicons
                            name="pencil-outline"
                            size={15}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.balanceDivider,
                        { backgroundColor: colors.borderSubtle },
                      ]}
                    />

                    <View style={styles.cardFooter}>
                      <Text
                        style={[
                          styles.balanceLabel,
                          { color: colors.textMuted },
                        ]}
                      >
                        CURRENT BALANCE
                      </Text>
                      <Text
                        style={[
                          styles.balanceValue,
                          {
                            color: isActive
                              ? colors.accent
                              : colors.textPrimary,
                          },
                        ]}
                      >
                        {hideBalance
                          ? "••••••"
                          : formatMoney(
                              acc.currentBalance ?? acc.balance ?? 0,
                              acc.currency || acc.currencyCode
                            )}
                      </Text>
                    </View>

                    {isActive && (
                      <TouchableOpacity
                        onPress={() => {
                          haptics.light();
                          navigation.navigate("Finance");
                        }}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        style={[
                          styles.financeShortcutRow,
                          { borderTopColor: colors.borderSubtle },
                        ]}
                      >
                        <View style={styles.financeShortcutLeft}>
                          <Ionicons
                            name="pie-chart-outline"
                            size={14}
                            color={colors.accent}
                          />
                          <Text
                            style={[
                              styles.financeShortcutText,
                              { color: colors.accent },
                            ]}
                          >
                            Manage Vaults &amp; Monthly Finance
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color={colors.accent}
                        />
                      </TouchableOpacity>
                    )}
                  </Card>
                </PressableScale>
              </FadeInView>
            );
          })}
        </View>
      </ScrollView>

      <CreateAccountModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />

      <EditAccountModal
        visible={editModalVisible}
        account={editingAccount}
        onClose={() => {
          setEditModalVisible(false);
          setEditingAccount(null);
        }}
      />

      <CreateTransactionModal
        visible={transferModalVisible}
        onClose={() => setTransferModalVisible(false)}
        defaultType="Transfer"
        onSuccess={() => {
          void refetchAll();
        }}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: spacing.base,
    paddingBottom: spacing.xxl * 2,
  },
  introContainer: {
    marginBottom: spacing.base,
  },
  introHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  introTitle: {
    ...typography.title,
    fontSize: 19,
    fontWeight: "700",
  },
  introSubtitle: {
    ...typography.caption,
    lineHeight: 18,
    fontSize: 12,
  },
  topActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  topActionBtn: {
    flex: 1,
    minHeight: 40,
  },
  accountsList: {
    marginBottom: spacing.base,
  },
  cardPressable: {
    marginBottom: spacing.md,
  },
  accountCard: {
    padding: spacing.base + 2,
    borderRadius: radius.xl,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTopRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  editIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: spacing.sm,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  accountTextGroup: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  accountName: {
    ...typography.title,
    fontSize: 16,
    fontWeight: "600",
  },
  badge: {
    marginLeft: 2,
  },
  accountType: {
    ...typography.caption,
    marginTop: 2,
    fontSize: 12,
  },
  balanceDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  balanceLabel: {
    ...typography.caption,
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  balanceValue: {
    ...typography.title,
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  financeShortcutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  financeShortcutLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  financeShortcutText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: "600",
  },
});
