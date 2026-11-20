import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useOfflineSync } from "@/context/OfflineSyncContext";
import { useTheme } from "@/context/ThemeContext";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { Header } from "@/components/shared/Header";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PressableScale } from "@/components/ui/PressableScale";
import { FadeInView } from "@/components/ui/FadeInView";
import { CreateTransactionModal } from "@/screens/transactions/CreateTransactionModal";
import { CreateAccountModal } from "@/components/shared/CreateAccountModal";
import { QuickLogCustomizeModal } from "@/components/shared/QuickLogCustomizeModal";
import { CreateLendingModal } from "@/screens/lending/CreateLendingModal";
import { SpotlightTourModal } from "@/components/tutorial/SpotlightTourModal";
import { useTutorial } from "@/context/TutorialContext";
import { accountAllocationsApi } from "@/api/accountAllocations";
import { dashboardApi } from "@/api/dashboard";
import {
  getStarterQuickLogPresets,
  quickLogPresetsApi,
} from "@/api/quickLogPresets";
import { savingsGoalsApi } from "@/api/savingsGoals";
import { transactionsApi } from "@/api/transactions";
import { secureStore } from "@/security/secureStore";
import {
  AccountAllocationsOverviewResponse,
  DashboardSummaryDto,
  QuickLogPresetDto,
  SavingsGoalResponse,
  TransactionDto,
  TransactionType,
} from "@/types/api";
import { typography, radius, spacing } from "@/theme/tokens";
import { formatMoney } from "@/utils/currency";
import { formatDate } from "@/utils/date";
import { haptics } from "@/utils/haptics";

interface DashboardScreenProps {
  navigation: any;
}

function mapPresetIcon(icon: string): keyof typeof Ionicons.glyphMap {
  switch (icon.toLowerCase()) {
    case "coffee":
      return "cafe-outline";
    case "utensils":
      return "restaurant-outline";
    case "car":
      return "car-outline";
    case "shopping-bag":
      return "bag-outline";
    case "home":
      return "home-outline";
    case "heart":
      return "heart-outline";
    default:
      return "flash-outline";
  }
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { activeWorkspace, hideBalance, toggleHideBalance, refetchAll } =
    useWorkspace();
  const { pendingQueue, pendingCount, isSyncing, syncQueue, enqueueTransaction } =
    useOfflineSync();
  const { registerTargetRect, isTourActive, currentStepIndex, nextStep } =
    useTutorial();
  const { colors, isDark } = useTheme();
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TransactionDto[]>([]);
  const [allocationsOverview, setAllocationsOverview] =
    useState<AccountAllocationsOverviewResponse | null>(null);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoalResponse[]>([]);
  const [savedPresets, setSavedPresets] = useState<QuickLogPresetDto[]>([]);
  const [customizePresetsVisible, setCustomizePresetsVisible] = useState(false);
  const [recentlyLoggedKey, setRecentlyLoggedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const balanceCardRef = React.useRef<any>(null);
  const quickActionsRef = React.useRef<any>(null);

  const handleBalanceCardLayout = () => {
    balanceCardRef.current?.measureInWindow(
      (x: number, y: number, width: number, height: number) => {
        if (width > 0 && height > 0) {
          registerTargetRect("balance_card", { x, y, width, height });
        }
      }
    );
  };

  const handleQuickActionsLayout = () => {
    quickActionsRef.current?.measureInWindow(
      (x: number, y: number, width: number, height: number) => {
        if (width > 0 && height > 0) {
          registerTargetRect("quick_actions", { x, y, width, height });
        }
      }
    );
  };

  // Modals state
  const [txModalVisible, setTxModalVisible] = useState(false);
  const [txDefaultType, setTxDefaultType] = useState<"Expense" | "Income" | "Transfer">(
    "Expense"
  );
  const [editingTx, setEditingTx] = useState<TransactionDto | null>(null);
  const [lendingModalVisible, setLendingModalVisible] = useState(false);
  const [createAccountModalVisible, setCreateAccountModalVisible] = useState(false);

  const currency =
    activeWorkspace?.currency || activeWorkspace?.currencyCode || "USD";

  const loadData = useCallback(async () => {
    try {
      const accountId = activeWorkspace?.id;
      const [sumData, txData, allocData, goalsData, presetsData] = await Promise.all([
        dashboardApi.getSummary(accountId, currency),
        transactionsApi.list({
          accountId,
          page: 1,
          pageSize: 5,
        }),
        accountId
          ? accountAllocationsApi.getOverview(accountId).catch(() => null)
          : Promise.resolve(null),
        accountId
          ? savingsGoalsApi.getSavingsGoals(accountId).catch(() => [])
          : Promise.resolve([]),
        accountId
          ? quickLogPresetsApi.getByAccount(accountId).catch(async () => {
              const cached = await secureStore.getItemAsync(
                `vaultz_quick_log_presets_${accountId}`
              );
              return cached ? (JSON.parse(cached) as QuickLogPresetDto[]) : [];
            })
          : Promise.resolve([]),
      ]);
      setSummary(sumData);
      setRecentTransactions(txData.items || []);
      setAllocationsOverview(allocData);
      setSavingsGoals(goalsData || []);
      setSavedPresets(presetsData || []);
      if (accountId && presetsData.length > 0) {
        void secureStore.setItemAsync(
          `vaultz_quick_log_presets_${accountId}`,
          JSON.stringify(presetsData)
        );
      }
    } catch {
      // Offline fallback: keep existing or empty
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace?.id, currency]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    haptics.light();
    await Promise.all([syncQueue(), refetchAll(), loadData()]);
    setRefreshing(false);
  };

  const openTxModal = (type: "Expense" | "Income" | "Transfer") => {
    haptics.light();
    setEditingTx(null);
    setTxDefaultType(type);
    setTxModalVisible(true);
  };

  const openLendingModal = () => {
    haptics.light();
    setLendingModalVisible(true);
  };

  // Optimistic pending balance calculation
  const pendingDelta = useMemo(() => {
    if (!activeWorkspace?.id) return 0;
    return pendingQueue
      .filter((q) => q.accountId === activeWorkspace.id && q.syncStatus !== "failed")
      .reduce((acc, q) => {
        if (q.type === "Income") return acc + q.amount;
        if (q.type === "Expense" || q.type === "Transfer") return acc - q.amount;
        return acc;
      }, 0);
  }, [pendingQueue, activeWorkspace?.id]);

  // Offline pending items for the recent list
  const offlineRecent: TransactionDto[] = useMemo(() => {
    return pendingQueue
      .filter((q) => !activeWorkspace?.id || q.accountId === activeWorkspace.id)
      .map((q) => ({
        id: q.id,
        accountId: q.accountId,
        accountName: q.accountName,
        type:
          q.type === "Income"
            ? TransactionType.Income
            : q.type === "Transfer"
            ? TransactionType.Transfer
            : TransactionType.Expense,
        typeName: q.type,
        amount: q.amount,
        currency: q.currency,
        currencyCode: q.currency,
        category: q.category,
        categoryName: q.category,
        description: q.description || q.category,
        occurredOn: q.transactionDate.split("T")[0],
        transactionDate: q.transactionDate,
        createdAtUtc: q.createdAt,
        isPendingSync: true,
        syncStatus: q.syncStatus,
      }));
  }, [pendingQueue, activeWorkspace?.id]);

  const displayedRecentTransactions = useMemo(() => {
    return [...offlineRecent, ...recentTransactions].slice(0, 5);
  }, [offlineRecent, recentTransactions]);

  const rawBalance =
    activeWorkspace?.currentBalance ??
    activeWorkspace?.balance ??
    summary?.totalBalance ??
    0;
  const balance = rawBalance + pendingDelta;

  const activeSlices = allocationsOverview?.activeBudgetPlan?.slices ?? [];
  const starterPresets = getStarterQuickLogPresets(currency);
  const quickLogItems =
    savedPresets.length > 0
      ? savedPresets.map((p) => ({
          key: p.id,
          label: p.label,
          amount: p.amount,
          type: p.type,
          categoryId: p.categoryId ?? null,
          categoryName: p.categoryName ?? null,
          budgetSliceId: p.budgetSliceId ?? null,
          icon: p.icon,
          colorHex: p.colorHex,
        }))
      : starterPresets.map((s) => ({
          key: s.key,
          label: s.label,
          amount: s.amount,
          type: s.type,
          categoryId: null as string | null,
          categoryName: null as string | null,
          budgetSliceId: null as string | null,
          icon: s.icon,
          colorHex: s.colorHex,
        }));

  const handleTapQuickLog = async (item: (typeof quickLogItems)[number]) => {
    if (!activeWorkspace) return;

    const validSliceId =
      item.type === TransactionType.Expense &&
      item.budgetSliceId &&
      activeSlices.some((s) => s.id === item.budgetSliceId)
        ? item.budgetSliceId
        : null;

    await enqueueTransaction({
      accountId: activeWorkspace.id,
      accountName: activeWorkspace.name,
      currency,
      type: item.type === TransactionType.Income ? "Income" : "Expense",
      amount: item.amount,
      category: item.categoryName || item.label,
      categoryId: item.categoryId,
      description: item.label,
      transactionDate: new Date().toISOString(),
      budgetSliceId: validSliceId,
    });

    haptics.success();
    setRecentlyLoggedKey(item.key);
    setTimeout(() => {
      setRecentlyLoggedKey((prev) => (prev === item.key ? null : prev));
    }, 1200);
    await loadData();
  };

  return (
    <ScreenWrapper>
      <Header />

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
        {/* Balance Card */}
        <FadeInView delay={40} translateY={10}>
          <View ref={balanceCardRef} onLayout={handleBalanceCardLayout}>
            <Card style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>
                  {activeWorkspace
                    ? `${activeWorkspace.name.toUpperCase()} BALANCE`
                    : "TOTAL NET BALANCE"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    haptics.light();
                    toggleHideBalance();
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={hideBalance ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {isLoading ? (
                <Skeleton
                  width={180}
                  height={36}
                  style={{ marginVertical: 8, borderRadius: radius.md }}
                />
              ) : (
                <Text style={[styles.balanceValue, { color: colors.textPrimary }]}>
                  {hideBalance ? "••••••••" : formatMoney(balance, currency)}
                </Text>
              )}

              <View
                style={[styles.statsRow, { borderTopColor: colors.borderSubtle }]}
              >
                <View style={styles.statItem}>
                  <View
                    style={[
                      styles.statIconBadge,
                      { backgroundColor: colors.accentSoft },
                    ]}
                  >
                    <Ionicons
                      name="arrow-down-outline"
                      size={13}
                      color={colors.accent}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                      Income this month
                    </Text>
                    <Text style={[styles.statIncome, { color: colors.accent }]}>
                      {hideBalance
                        ? "••••"
                        : formatMoney(summary?.monthlyIncome ?? 0, currency)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statDivider,
                    { backgroundColor: colors.borderSubtle },
                  ]}
                />

                <View style={styles.statItem}>
                  <View
                    style={[
                      styles.statIconBadge,
                      { backgroundColor: colors.dangerSoft },
                    ]}
                  >
                    <Ionicons
                      name="arrow-up-outline"
                      size={13}
                      color={colors.danger}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                      Spent this month
                    </Text>
                    <Text style={[styles.statExpense, { color: colors.danger }]}>
                      {hideBalance
                        ? "••••"
                        : formatMoney(summary?.monthlyExpenses ?? 0, currency)}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          </View>
        </FadeInView>

        {/* Quick Actions */}
        <FadeInView delay={90} translateY={10}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              QUICK ACTIONS
            </Text>
          </View>

          <View
            ref={quickActionsRef}
            onLayout={handleQuickActionsLayout}
            style={styles.quickActionsGrid}
          >
            <PressableScale
              style={styles.actionBtn}
              onPress={() => openTxModal("Expense")}
            >
              <View
                style={[
                  styles.actionIconContainer,
                  { backgroundColor: colors.dangerSoft },
                ]}
              >
                <Ionicons
                  name="arrow-up-outline"
                  size={20}
                  color={colors.danger}
                />
              </View>
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>
                Expense
              </Text>
            </PressableScale>

            <PressableScale
              style={styles.actionBtn}
              onPress={() => openTxModal("Income")}
            >
              <View
                style={[
                  styles.actionIconContainer,
                  { backgroundColor: colors.accentSoft },
                ]}
              >
                <Ionicons
                  name="arrow-down-outline"
                  size={20}
                  color={colors.accent}
                />
              </View>
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>
                Income
              </Text>
            </PressableScale>

            <PressableScale
              style={styles.actionBtn}
              onPress={() => openTxModal("Transfer")}
            >
              <View
                style={[
                  styles.actionIconContainer,
                  { backgroundColor: isDark ? "#192538" : "#EFF6FF" },
                ]}
              >
                <Ionicons
                  name="swap-horizontal-outline"
                  size={20}
                  color={isDark ? "#60A5FA" : "#2563EB"}
                />
              </View>
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>
                Transfer
              </Text>
            </PressableScale>

            <PressableScale style={styles.actionBtn} onPress={openLendingModal}>
              <View
                style={[
                  styles.actionIconContainer,
                  { backgroundColor: colors.warningSoft },
                ]}
              >
                <Ionicons
                  name="people-outline"
                  size={20}
                  color={colors.warning}
                />
              </View>
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>
                IOU / Loan
              </Text>
            </PressableScale>
          </View>
        </FadeInView>

        {/* 1-Tap Quick Log Row */}
        {activeWorkspace && (
          <FadeInView delay={110} translateY={10}>
            <View style={styles.sectionHeaderWithAction}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                1-TAP QUICK LOG
              </Text>
              <TouchableOpacity
                onPress={() => {
                  haptics.light();
                  setCustomizePresetsVisible(true);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.viewAllText, { color: colors.accent }]}>
                  Customize
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickLogRow}
            >
              {quickLogItems.map((item) => {
                const isJustLogged = recentlyLoggedKey === item.key;
                const isIncome = item.type === TransactionType.Income;
                return (
                  <PressableScale
                    key={item.key}
                    onPress={() => handleTapQuickLog(item)}
                    style={[
                      styles.quickLogPill,
                      {
                        backgroundColor: isJustLogged
                          ? colors.accentSoft
                          : colors.surface,
                        borderColor: isJustLogged
                          ? colors.accent
                          : colors.borderSubtle,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.quickLogIconWrap,
                        {
                          backgroundColor: isDark
                            ? colors.surfaceSubtle
                            : colors.surfaceMuted,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          isJustLogged
                            ? "checkmark-outline"
                            : mapPresetIcon(item.icon)
                        }
                        size={15}
                        color={
                          isJustLogged
                            ? colors.accent
                            : item.colorHex || colors.accent
                        }
                      />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.quickLogLabel,
                          { color: colors.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={[
                          styles.quickLogAmount,
                          { color: isIncome ? colors.accent : colors.textMuted },
                        ]}
                      >
                        {isIncome ? "+" : "-"}
                        {hideBalance ? "•••" : formatMoney(item.amount, currency)}
                      </Text>
                    </View>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </FadeInView>
        )}

        {/* Offline Pending Sync Banner */}
        {pendingCount > 0 && (
          <FadeInView delay={120} translateY={10}>
            <View
              style={[
                styles.syncBanner,
                {
                  backgroundColor: colors.warningSoft,
                  borderColor: isDark ? colors.borderSubtle : colors.warning,
                },
              ]}
            >
              <View style={styles.syncBannerLeft}>
                <Ionicons
                  name="cloud-upload-outline"
                  size={18}
                  color={colors.warning}
                />
                <View style={styles.syncBannerTexts}>
                  <Text
                    style={[styles.syncBannerTitle, { color: colors.textPrimary }]}
                  >
                    {pendingCount}{" "}
                    {pendingCount === 1 ? "transaction" : "transactions"} saved
                    offline
                  </Text>
                  <Text
                    style={[styles.syncBannerSubtitle, { color: colors.textMuted }]}
                  >
                    Will sync automatically once connected
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.syncBannerBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                  },
                ]}
                onPress={() => void syncQueue()}
                disabled={isSyncing}
              >
                <Text style={[styles.syncBannerBtnText, { color: colors.accent }]}>
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </Text>
              </TouchableOpacity>
            </View>
          </FadeInView>
        )}

        {/* Monthly Finance & Vaults Pacing Card */}
        {activeWorkspace && (
          <FadeInView delay={130} translateY={10}>
            <View style={styles.sectionHeaderWithAction}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                MONTHLY FINANCE
              </Text>
              <TouchableOpacity
                onPress={() => {
                  haptics.light();
                  navigation.navigate("Finance");
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.viewAllText, { color: colors.accent }]}>
                  Manage ›
                </Text>
              </TouchableOpacity>
            </View>

            <PressableScale
              onPress={() => {
                haptics.light();
                navigation.navigate("Finance");
              }}
            >
              <Card
                variant="surface"
                style={[styles.financeCard, { borderColor: colors.borderSubtle }]}
              >
                <View style={styles.financeMetricsRow}>
                  <View style={styles.financeMetricCol}>
                    <Text
                      style={[
                        styles.financeMetricLabel,
                        { color: colors.textMuted },
                      ]}
                    >
                      Vaults
                    </Text>
                    <Text
                      style={[
                        styles.financeMetricValue,
                        { color: colors.accent },
                      ]}
                      numberOfLines={1}
                    >
                      {hideBalance
                        ? "••••"
                        : formatMoney(
                            allocationsOverview?.totalAllocatedInVaults ?? 0,
                            currency
                          )}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.financeMetricDivider,
                      { backgroundColor: colors.borderSubtle },
                    ]}
                  />
                  <View style={styles.financeMetricCol}>
                    <Text
                      style={[
                        styles.financeMetricLabel,
                        { color: colors.textMuted },
                      ]}
                    >
                      Budget Left
                    </Text>
                    <Text
                      style={[
                        styles.financeMetricValue,
                        { color: colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {hideBalance
                        ? "••••"
                        : formatMoney(
                            allocationsOverview?.activePlanRemaining ?? 0,
                            currency
                          )}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.financeMetricDivider,
                      { backgroundColor: colors.borderSubtle },
                    ]}
                  />
                  <View style={styles.financeMetricCol}>
                    <Text
                      style={[
                        styles.financeMetricLabel,
                        { color: colors.textMuted },
                      ]}
                    >
                      Available
                    </Text>
                    <Text
                      style={[
                        styles.financeMetricValue,
                        { color: colors.warning },
                      ]}
                      numberOfLines={1}
                    >
                      {hideBalance
                        ? "••••"
                        : formatMoney(
                            allocationsOverview?.unallocatedBalance ?? balance,
                            currency
                          )}
                    </Text>
                  </View>
                </View>

                {activeSlices.length > 0 ? (
                  <View
                    style={[
                      styles.sliceList,
                      { borderTopColor: colors.borderSubtle },
                    ]}
                  >
                    {activeSlices.slice(0, 3).map((slice) => {
                      const pct =
                        slice.allocatedAmount > 0
                          ? Math.min(
                              100,
                              (slice.spentAmount / slice.allocatedAmount) * 100
                            )
                          : 0;
                      const isDepleted = slice.remainingAmount <= 0;
                      return (
                        <View key={slice.id} style={styles.sliceItem}>
                          <View style={styles.sliceLabelRow}>
                            <Text
                              style={[
                                styles.sliceName,
                                { color: colors.textPrimary },
                              ]}
                              numberOfLines={1}
                            >
                              {slice.name}
                            </Text>
                            <Text
                              style={[
                                styles.sliceRemaining,
                                {
                                  color: isDepleted ? colors.danger : colors.accent,
                                },
                              ]}
                            >
                              {hideBalance
                                ? "••••"
                                : isDepleted
                                ? "Depleted"
                                : `${formatMoney(slice.remainingAmount, currency)} left`}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.sliceTrack,
                              {
                                backgroundColor: isDark
                                  ? colors.surfaceSubtle
                                  : colors.surfaceMuted,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.sliceFill,
                                {
                                  width: `${pct}%`,
                                  backgroundColor: isDepleted
                                    ? colors.danger
                                    : colors.accent,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View
                    style={[
                      styles.financeCtaRow,
                      { borderTopColor: colors.borderSubtle },
                    ]}
                  >
                    <Text
                      style={[styles.financeCtaText, { color: colors.accent }]}
                    >
                      Set up purpose vaults &amp; monthly budgets →
                    </Text>
                  </View>
                )}
              </Card>
            </PressableScale>
          </FadeInView>
        )}

        {/* Compact Savings Goals Card */}
        {activeWorkspace && savingsGoals.length > 0 && (
          <FadeInView delay={145} translateY={10}>
            <View style={styles.sectionHeaderWithAction}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                SAVINGS GOALS
              </Text>
              <TouchableOpacity
                onPress={() => {
                  haptics.light();
                  navigation.navigate("SavingsGoals");
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.viewAllText, { color: colors.accent }]}>
                  Manage ›
                </Text>
              </TouchableOpacity>
            </View>

            <PressableScale
              onPress={() => {
                haptics.light();
                navigation.navigate("SavingsGoals");
              }}
            >
              <Card
                variant="surface"
                style={[styles.financeCard, { borderColor: colors.borderSubtle }]}
              >
                <View style={styles.goalsList}>
                  {savingsGoals.slice(0, 2).map((g) => {
                    const pct = Math.min(100, Math.max(0, g.progressPercent));
                    return (
                      <View key={g.id} style={styles.sliceItem}>
                        <View style={styles.sliceLabelRow}>
                          <Text
                            style={[
                              styles.sliceName,
                              { color: colors.textPrimary },
                            ]}
                            numberOfLines={1}
                          >
                            {g.name}
                          </Text>
                          <Text
                            style={[
                              styles.sliceRemaining,
                              { color: colors.accent },
                            ]}
                          >
                            {hideBalance
                              ? "••••"
                              : `${formatMoney(g.currentAmount, g.currencyCode)} / ${formatMoney(g.targetAmount, g.currencyCode)}`}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.sliceTrack,
                            {
                              backgroundColor: isDark
                                ? colors.surfaceSubtle
                                : colors.surfaceMuted,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.sliceFill,
                              {
                                width: `${pct}%`,
                                backgroundColor: colors.accent,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Card>
            </PressableScale>
          </FadeInView>
        )}

        {/* Recent Activity */}
        <FadeInView delay={160} translateY={10}>
          <View style={styles.sectionHeaderWithAction}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              RECENT ACTIVITY
            </Text>
            <TouchableOpacity
              onPress={() => {
                haptics.light();
                navigation.navigate("Transactions");
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.viewAllText, { color: colors.accent }]}>
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <Card
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                padding: spacing.base,
              }}
            >
              <Skeleton
                height={28}
                style={{ marginBottom: 10, borderRadius: radius.sm }}
              />
              <Skeleton
                height={28}
                style={{ marginBottom: 10, borderRadius: radius.sm }}
              />
              <Skeleton height={28} style={{ borderRadius: radius.sm }} />
            </Card>
          ) : displayedRecentTransactions.length === 0 ? (
            <Card
              style={[
                styles.emptyCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="receipt-outline"
                size={34}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No transactions recorded
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Use the quick actions above to log your first transaction.
              </Text>
            </Card>
          ) : (
            <Card
              style={{
                padding: 0,
                borderRadius: radius.lg,
                overflow: "hidden",
              }}
            >
              {displayedRecentTransactions.map((tx, idx) => {
                const isExpense =
                  tx.type === TransactionType.Expense ||
                  tx.typeName === "Expense";
                const isIncome =
                  tx.type === TransactionType.Income || tx.typeName === "Income";
                const isLast = idx === displayedRecentTransactions.length - 1;

                const iconBg = isExpense
                  ? colors.dangerSoft
                  : isIncome
                  ? colors.accentSoft
                  : isDark
                  ? "rgba(59, 130, 246, 0.14)"
                  : "rgba(37, 99, 235, 0.08)";

                const iconColor = isExpense
                  ? colors.danger
                  : isIncome
                  ? colors.accent
                  : isDark
                  ? "#60A5FA"
                  : "#2563EB";

                const primaryTitle =
                  tx.description || tx.categoryName || tx.category || "Entry";
                const subCategory = tx.categoryName || tx.category;

                return (
                  <PressableScale
                    key={tx.id}
                    onPress={() => {
                      haptics.light();
                      if (tx.isPendingSync) {
                        navigation.navigate("Transactions");
                      } else {
                        setEditingTx(tx);
                        setTxModalVisible(true);
                      }
                    }}
                    style={[
                      styles.txRow,
                      !isLast && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.borderSubtle,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.txIconContainer,
                        { backgroundColor: iconBg },
                      ]}
                    >
                      <Ionicons
                        name={
                          isExpense
                            ? "arrow-up-outline"
                            : isIncome
                            ? "arrow-down-outline"
                            : "swap-horizontal-outline"
                        }
                        size={17}
                        color={iconColor}
                      />
                    </View>

                    <View style={styles.txDetails}>
                      <Text
                        style={[
                          styles.txCategory,
                          { color: colors.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {primaryTitle}
                      </Text>
                      <Text
                        style={[styles.txMeta, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {formatDate(tx.transactionDate || tx.occurredOn)}
                        {subCategory && subCategory !== primaryTitle
                          ? ` • ${subCategory}`
                          : ""}
                      </Text>
                    </View>

                    <View style={styles.txAmountContainer}>
                      <Text
                        style={[
                          styles.txAmount,
                          {
                            color: isExpense
                              ? colors.danger
                              : isIncome
                              ? colors.accent
                              : colors.textPrimary,
                          },
                        ]}
                      >
                        {hideBalance
                          ? "••••"
                          : `${isExpense ? "-" : isIncome ? "+" : ""}${formatMoney(
                              tx.amount,
                              tx.currency || tx.currencyCode || currency
                            )}`}
                      </Text>
                      {tx.isPendingSync && (
                        <View style={styles.pendingBadgeRow}>
                          <Ionicons
                            name={
                              tx.syncStatus === "failed"
                                ? "alert-circle"
                                : "cloud-upload-outline"
                            }
                            size={10}
                            color={
                              tx.syncStatus === "failed"
                                ? colors.danger
                                : colors.warning
                            }
                          />
                          <Text
                            style={[
                              styles.pendingBadgeText,
                              {
                                color:
                                  tx.syncStatus === "failed"
                                    ? colors.danger
                                    : colors.warning,
                              },
                            ]}
                          >
                            {tx.syncStatus === "failed" ? "Failed" : "Pending"}
                          </Text>
                        </View>
                      )}
                    </View>
                  </PressableScale>
                );
              })}
            </Card>
          )}
        </FadeInView>
      </ScrollView>

      {/* Transaction creation / edit modal */}
      <CreateTransactionModal
        visible={txModalVisible}
        onClose={() => {
          setTxModalVisible(false);
          setEditingTx(null);
        }}
        defaultType={txDefaultType}
        editingTransaction={editingTx}
        onSuccess={() => {
          void loadData();
          if (!editingTx && isTourActive && currentStepIndex === 2) {
            nextStep();
          }
        }}
      />

      {/* Lending modal */}
      <CreateLendingModal
        visible={lendingModalVisible}
        onClose={() => setLendingModalVisible(false)}
        onSuccess={loadData}
      />

      {/* Create Account Modal for guided onboarding */}
      <CreateAccountModal
        visible={createAccountModalVisible}
        onClose={() => setCreateAccountModalVisible(false)}
        onSuccess={() => {
          void loadData();
          if (isTourActive && currentStepIndex === 0) {
            nextStep();
          }
        }}
      />

      {/* Interactive Spotlight Guided Tour */}
      <SpotlightTourModal
        isActionModalOpen={
          txModalVisible ||
          lendingModalVisible ||
          createAccountModalVisible ||
          customizePresetsVisible
        }
        onActionTrigger={(action) => {
          if (action === "create_account") {
            setCreateAccountModalVisible(true);
          } else if (action === "record_transaction") {
            openTxModal("Expense");
          }
        }}
      />

      {/* Customize 1-Tap Quick Log Modal */}
      {activeWorkspace && (
        <QuickLogCustomizeModal
          visible={customizePresetsVisible}
          onClose={() => setCustomizePresetsVisible(false)}
          accountId={activeWorkspace.id}
          accountName={activeWorkspace.name}
          currencyCode={currency}
          savedPresets={savedPresets}
          activeSlices={activeSlices}
          onSaved={(updated) => setSavedPresets(updated)}
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: spacing.base,
    paddingBottom: spacing.xxl * 2,
  },
  balanceCard: {
    marginBottom: spacing.base + 2,
    padding: spacing.lg,
    borderRadius: radius.xl,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  balanceLabel: {
    ...typography.caption,
    letterSpacing: 0.8,
    fontWeight: "700",
    fontSize: 11,
  },
  balanceValue: {
    ...typography.display,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginVertical: 4,
    fontVariant: ["tabular-nums"],
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "500",
  },
  statIncome: {
    ...typography.body,
    fontWeight: "700",
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  statExpense: {
    ...typography.body,
    fontWeight: "700",
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    marginHorizontal: spacing.sm,
  },
  sectionHeader: {
    marginBottom: spacing.xs + 2,
  },
  sectionHeaderWithAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs + 2,
    marginTop: spacing.base,
  },
  sectionTitle: {
    ...typography.label,
    letterSpacing: 0.8,
    fontSize: 11,
    fontWeight: "700",
  },
  viewAllText: {
    ...typography.caption,
    fontWeight: "600",
    fontSize: 12,
  },
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    paddingVertical: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },
  actionText: {
    ...typography.caption,
    fontWeight: "600",
    fontSize: 11,
    letterSpacing: 0.2,
  },
  emptyCard: {
    alignItems: "center",
    padding: spacing.xxl,
    borderRadius: radius.lg,
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
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  txIconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  txDetails: {
    flex: 1,
    marginRight: spacing.sm,
  },
  txCategory: {
    ...typography.body,
    fontWeight: "600",
    fontSize: 14,
  },
  txMeta: {
    ...typography.caption,
    marginTop: 2,
    fontSize: 12,
  },
  txAmount: {
    ...typography.bodyLarge,
    fontWeight: "700",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  txAmountContainer: {
    alignItems: "flex-end",
  },
  pendingBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  pendingBadgeText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: "700",
  },
  syncBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  syncBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  syncBannerTexts: {
    flex: 1,
  },
  syncBannerTitle: {
    ...typography.caption,
    fontWeight: "700",
    fontSize: 12,
  },
  syncBannerSubtitle: {
    ...typography.caption,
    fontSize: 10,
    marginTop: 1,
  },
  syncBannerBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
    marginLeft: spacing.sm,
  },
  syncBannerBtnText: {
    ...typography.caption,
    fontWeight: "700",
    fontSize: 11,
  },
  quickLogRow: {
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  quickLogPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
    minHeight: 46,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickLogIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLogLabel: {
    ...typography.label,
    fontSize: 13,
    fontWeight: "600",
  },
  quickLogAmount: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  financeCard: {
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xs,
  },
  financeMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  financeMetricCol: {
    flex: 1,
  },
  financeMetricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    marginHorizontal: spacing.sm,
  },
  financeMetricLabel: {
    ...typography.caption,
    fontSize: 11,
    marginBottom: 2,
  },
  financeMetricValue: {
    ...typography.label,
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  sliceList: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  goalsList: {
    gap: spacing.sm,
  },
  sliceItem: {
    gap: 5,
  },
  sliceLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliceName: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    marginRight: spacing.sm,
  },
  sliceRemaining: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  sliceTrack: {
    height: 5,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  sliceFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  financeCtaRow: {
    marginTop: spacing.md,
    paddingTop: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  financeCtaText: {
    ...typography.label,
    fontSize: 12,
    fontWeight: "600",
  },
});
