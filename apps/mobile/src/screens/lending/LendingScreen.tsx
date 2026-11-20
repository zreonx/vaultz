import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useTheme } from "@/context/ThemeContext";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { StackHeader } from "@/components/shared/StackHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { PressableScale } from "@/components/ui/PressableScale";
import { CreateLendingModal } from "./CreateLendingModal";
import { LogRepaymentModal } from "./LogRepaymentModal";
import { lendingApi } from "@/api/lending";
import {
  LendingSummaryDto,
  LendingItemDto,
  LendingType,
  LendingStatus,
} from "@/types/api";
import { typography, radius, spacing } from "@/theme/tokens";
import { formatMoney } from "@/utils/currency";
import { haptics } from "@/utils/haptics";

const LENDING_TABS = ["All", "Lent", "Borrowed", "Settled"] as const;

export const LendingScreen: React.FC = () => {
  const { activeWorkspace, hideBalance, refetchAll } = useWorkspace();
  const { colors, isDark } = useTheme();
  const [summary, setSummary] = useState<LendingSummaryDto | null>(null);
  const [items, setItems] = useState<LendingItemDto[]>([]);
  const [selectedTab, setSelectedTab] =
    useState<(typeof LENDING_TABS)[number]>("All");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [repaymentModalVisible, setRepaymentModalVisible] = useState(false);
  const [selectedItemForRepay, setSelectedItemForRepay] =
    useState<LendingItemDto | null>(null);

  const currency =
    activeWorkspace?.currency || activeWorkspace?.currencyCode || "USD";

  const loadData = useCallback(async () => {
    try {
      const [sumRes, itemsRes] = await Promise.all([
        lendingApi.getSummary(activeWorkspace?.id),
        lendingApi.list({
          accountId: activeWorkspace?.id,
          type:
            selectedTab === "Lent" || selectedTab === "Borrowed"
              ? selectedTab
              : undefined,
          status: selectedTab === "Settled" ? "Settled" : undefined,
        }),
      ]);
      setSummary(sumRes);
      setItems(itemsRes);
    } catch {
      // Keep existing state on transient error
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace?.id, selectedTab]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    haptics.light();
    await loadData();
    setRefreshing(false);
  };

  const handleTabChange = (tab: (typeof LENDING_TABS)[number]) => {
    haptics.selection();
    setSelectedTab(tab);
  };

  const handleOpenRepayment = (item: LendingItemDto) => {
    haptics.light();
    setSelectedItemForRepay(item);
    setRepaymentModalVisible(true);
  };

  const handleSettle = (item: LendingItemDto) => {
    const bal = item.remainingBalance ?? item.remainingAmount ?? 0;
    const curr = item.currency || item.currencyCode;
    if (bal <= 0) return;

    Alert.alert(
      "Mark as Settled",
      `Record final repayment of ${formatMoney(bal, curr)} and mark this IOU as settled?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Settle in Full",
          onPress: async () => {
            try {
              haptics.medium();
              await lendingApi.settle(item.id, bal, true);
              haptics.success();
              await Promise.all([loadData(), refetchAll()]);
            } catch (err: any) {
              haptics.error();
              Alert.alert("Error", err?.message || "Failed to settle loan");
            }
          },
        },
      ]
    );
  };

  const handleDelete = (item: LendingItemDto) => {
    const name = item.borrowerOrLenderName || item.counterparty;
    Alert.alert(
      "Delete IOU Record",
      `Permanently remove the IOU with ${name}? This does not reverse previously logged account transactions.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await lendingApi.deleteRecord(item.id);
              haptics.success();
              await Promise.all([loadData(), refetchAll()]);
            } catch (err: any) {
              haptics.error();
              Alert.alert("Error", err?.message || "Failed to delete IOU");
            }
          },
        },
      ]
    );
  };

  const renderLendingCard = ({ item }: { item: LendingItemDto }) => {
    const isLent = item.type === LendingType.Lent || item.typeName === "Lent";
    const isSettled =
      item.status === LendingStatus.Settled || item.statusName === "Settled";
    const totalAmount = item.totalAmount ?? item.originalAmount ?? 1;
    const remainingBalance =
      item.remainingBalance ?? item.remainingAmount ?? 0;
    const percentPaid = Math.min(
      100,
      Math.max(0, (item.repaidAmount / totalAmount) * 100)
    );
    const curr = item.currency || item.currencyCode;

    return (
      <Card style={styles.itemCard}>
        <View style={styles.cardHeader}>
          <View style={styles.nameContainer}>
            <Text
              style={[styles.contactName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {item.borrowerOrLenderName || item.counterparty}
            </Text>
            <Badge
              label={isLent ? "Lent (Owed to you)" : "Borrowed (You owe)"}
              variant={isLent ? "success" : "warning"}
              style={styles.typeBadge}
            />
          </View>
          <View style={styles.headerRightCol}>
            <Badge
              label={item.statusName || String(item.status)}
              variant={isSettled ? "outline" : "info"}
            />
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.deleteBtn}
              accessibilityLabel="Delete IOU"
            >
              <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.amountSection}>
          <View>
            <Text style={[styles.amountLabel, { color: colors.textMuted }]}>
              Remaining Balance
            </Text>
            <Text
              style={[
                styles.remainingAmount,
                { color: isLent ? colors.accent : colors.warning },
              ]}
            >
              {hideBalance ? "••••" : formatMoney(remainingBalance, curr)}
            </Text>
          </View>
          <View style={styles.totalSection}>
            <Text style={[styles.amountLabel, { color: colors.textMuted }]}>
              Total Principal
            </Text>
            <Text
              style={[styles.totalAmount, { color: colors.textSecondary }]}
            >
              {hideBalance ? "••••" : formatMoney(totalAmount, curr)}
            </Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBarBg,
              {
                backgroundColor: isDark
                  ? colors.surfaceSubtle
                  : colors.surfaceMuted,
              },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${percentPaid}%`,
                  backgroundColor: isLent ? colors.accent : colors.warning,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textMuted }]}>
            {hideBalance
              ? "••••"
              : `${formatMoney(item.repaidAmount, curr)} paid (${Math.round(percentPaid)}%)`}
          </Text>
        </View>

        {item.notes && (
          <Text
            style={[styles.notesText, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            "{item.notes}"
          </Text>
        )}

        {!isSettled && (
          <View
            style={[styles.actionRow, { borderTopColor: colors.borderSubtle }]}
          >
            <Button
              title="Log Repayment"
              variant="secondary"
              leftIcon="cash-outline"
              size="sm"
              onPress={() => handleOpenRepayment(item)}
              style={styles.actionBtn}
            />
            <Button
              title="Settle"
              variant="ghost"
              size="sm"
              onPress={() => handleSettle(item)}
              style={styles.settleBtn}
            />
          </View>
        )}
      </Card>
    );
  };

  return (
    <ScreenWrapper>
      <StackHeader
        title="IOUs & Lending"
        subtitle={
          activeWorkspace ? `${activeWorkspace.name} • ${currency}` : undefined
        }
      />

      <View style={styles.container}>
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              OWED TO YOU
            </Text>
            <Text style={[styles.summaryValue, { color: colors.accent }]}>
              {hideBalance
                ? "••••"
                : formatMoney(summary?.totalLent ?? 0, currency)}
            </Text>
          </Card>

          <Card style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              YOU OWE
            </Text>
            <Text style={[styles.summaryValue, { color: colors.warning }]}>
              {hideBalance
                ? "••••"
                : formatMoney(summary?.totalBorrowed ?? 0, currency)}
            </Text>
          </Card>
        </View>

        <View style={styles.filterTabs}>
          {LENDING_TABS.map((tab) => {
            const isActive = selectedTab === tab;
            return (
              <PressableScale
                key={tab}
                style={[
                  styles.tabBtn,
                  {
                    backgroundColor: isActive
                      ? colors.accentMuted
                      : isDark
                      ? colors.surfaceSubtle
                      : colors.surfaceMuted,
                    borderColor: isActive ? colors.accent : colors.borderSubtle,
                  },
                ]}
                onPress={() => handleTabChange(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: isActive ? colors.accent : colors.textSecondary,
                      fontWeight: isActive ? "700" : "500",
                    },
                  ]}
                >
                  {tab}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Skeleton
              height={140}
              style={{ marginBottom: 12, borderRadius: radius.lg }}
            />
            <Skeleton height={140} style={{ borderRadius: radius.lg }} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderLendingCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
                colors={[colors.accent]}
              />
            }
            ListEmptyComponent={
              <Card style={styles.emptyCard}>
                <Ionicons
                  name="people-outline"
                  size={36}
                  color={colors.textMuted}
                />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  No loans or IOUs found
                </Text>
                <Text
                  style={[styles.emptySubtitle, { color: colors.textMuted }]}
                >
                  Track money you lend to friends or borrow from colleagues.
                </Text>
              </Card>
            }
          />
        )}

        <PressableScale
          style={[
            styles.fab,
            {
              backgroundColor: colors.accent,
              shadowColor: colors.accent,
            },
          ]}
          onPress={() => {
            haptics.light();
            setCreateModalVisible(true);
          }}
          accessibilityLabel="Add IOU or loan"
        >
          <Ionicons name="add" size={26} color={colors.accentForeground} />
        </PressableScale>
      </View>

      <CreateLendingModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={() => {
          void loadData();
          void refetchAll();
        }}
      />

      <LogRepaymentModal
        visible={repaymentModalVisible}
        item={selectedItemForRepay}
        onClose={() => {
          setRepaymentModalVisible(false);
          setSelectedItemForRepay(null);
        }}
        onSuccess={() => {
          void loadData();
          void refetchAll();
        }}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: spacing.base,
    borderRadius: radius.xl,
  },
  summaryLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    ...typography.title,
    fontSize: 19,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  filterTabs: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tabBtn: {
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    paddingTop: spacing.xs,
  },
  listContent: {
    paddingBottom: spacing.xxl * 3,
  },
  itemCard: {
    marginBottom: spacing.md,
    padding: spacing.base + 2,
    borderRadius: radius.xl,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  nameContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  headerRightCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  contactName: {
    ...typography.title,
    fontSize: 16,
    fontWeight: "600",
  },
  typeBadge: {
    marginTop: 4,
  },
  amountSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: spacing.md,
  },
  amountLabel: {
    ...typography.caption,
    fontSize: 11,
    marginBottom: 2,
  },
  remainingAmount: {
    ...typography.title,
    fontSize: 20,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  totalSection: {
    alignItems: "flex-end",
  },
  totalAmount: {
    ...typography.body,
    fontWeight: "600",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    ...typography.caption,
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  notesText: {
    ...typography.caption,
    fontStyle: "italic",
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
  actionBtn: {
    flex: 2,
  },
  settleBtn: {
    flex: 1,
  },
  emptyCard: {
    alignItems: "center",
    padding: spacing.xxl,
    marginTop: spacing.lg,
  },
  emptyTitle: {
    ...typography.bodyLarge,
    fontWeight: "600",
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.caption,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  fab: {
    position: "absolute",
    right: spacing.base,
    bottom: spacing.xxl + spacing.md,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
