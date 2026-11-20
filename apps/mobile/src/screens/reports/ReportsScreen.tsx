import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StackHeader } from "@/components/shared/StackHeader";
import { reportsApi } from "@/api/reports";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useTheme } from "@/context/ThemeContext";
import { CashFlowReportResponse, CategoryBreakdownItem } from "@/types/api";
import { formatMoney } from "@/utils/currency";
import { radius, spacing, typography } from "@/theme/tokens";
import { haptics } from "@/utils/haptics";

type PeriodKey = "this_month" | "last_month" | "90_days" | "ytd";
type ScopeKey = "account" | "all";
type BreakdownTab = "expense" | "income";

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getPeriodRange(period: PeriodKey): { fromDate: string; toDate: string; label: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "last_month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        fromDate: formatLocalDate(start),
        toDate: formatLocalDate(end),
        label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      };
    }
    case "90_days": {
      const start = new Date(today);
      start.setDate(start.getDate() - 89);
      return {
        fromDate: formatLocalDate(start),
        toDate: formatLocalDate(today),
        label: "Last 90 Days",
      };
    }
    case "ytd": {
      const start = new Date(today.getFullYear(), 0, 1);
      return {
        fromDate: formatLocalDate(start),
        toDate: formatLocalDate(today),
        label: `Year to Date (${today.getFullYear()})`,
      };
    }
    case "this_month":
    default: {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        fromDate: formatLocalDate(start),
        toDate: formatLocalDate(today),
        label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      };
    }
  }
}

export const ReportsScreen: React.FC = () => {
  const { user } = useAuth();
  const { activeWorkspace, hideBalance } = useWorkspace();
  const { colors } = useTheme();

  const [period, setPeriod] = useState<PeriodKey>("this_month");
  const [scope, setScope] = useState<ScopeKey>(activeWorkspace ? "account" : "all");
  const [breakdownTab, setBreakdownTab] = useState<BreakdownTab>("expense");

  const [report, setReport] = useState<CashFlowReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => getPeriodRange(period), [period]);
  const effectiveAccountId =
    scope === "account" && activeWorkspace ? activeWorkspace.id : undefined;
  const effectiveCurrency =
    scope === "account" && activeWorkspace
      ? activeWorkspace.currencyCode
      : user?.defaultCurrencyCode || activeWorkspace?.currencyCode || "USD";

  const loadReport = useCallback(async () => {
    setError(null);
    try {
      const data = await reportsApi.getCashFlowReport({
        fromDate: range.fromDate,
        toDate: range.toDate,
        currencyCode: effectiveCurrency,
        accountId: effectiveAccountId,
      });
      setReport(data);
    } catch (err: any) {
      setError(err?.message || "Unable to load cash flow report.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [range.fromDate, range.toDate, effectiveCurrency, effectiveAccountId]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadReport();
    }, [loadReport])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    void loadReport();
  };

  const fmt = (amount: number, currencyCode: string) =>
    hideBalance ? "••••••" : formatMoney(amount, currencyCode);

  const activeItems: CategoryBreakdownItem[] = useMemo(() => {
    if (!report) return [];
    return breakdownTab === "expense"
      ? report.expenseByCategory || []
      : report.incomeByCategory || [];
  }, [report, breakdownTab]);

  const reportCurrency = report?.currencyCode || effectiveCurrency;
  const netPositive = (report?.netCashFlow ?? 0) >= 0;

  return (
    <ScreenWrapper>
      <StackHeader
        title="Reports & Analytics"
        subtitle={`${range.label} · ${effectiveCurrency}`}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.container}>
        {/* Period Filter */}
        <View style={styles.chipRow}>
          {(
            [
              { key: "this_month", label: "This Month" },
              { key: "last_month", label: "Last Month" },
              { key: "90_days", label: "90 Days" },
              { key: "ytd", label: "YTD" },
            ] as const
          ).map((item) => {
            const active = period === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => {
                  haptics.light();
                  setPeriod(item.key);
                }}
                style={[
                  styles.periodChip,
                  {
                    backgroundColor: active ? colors.accent : colors.surface,
                    borderColor: active ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.periodChipText,
                    { color: active ? colors.accentForeground : colors.textSecondary },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Scope Selector when an active account exists */}
        {activeWorkspace ? (
          <View
            style={[
              styles.scopeSegment,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                haptics.light();
                setScope("account");
              }}
              style={[
                styles.scopeBtn,
                scope === "account" && { backgroundColor: colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.scopeText,
                  {
                    color: scope === "account" ? colors.textPrimary : colors.textMuted,
                    fontWeight: scope === "account" ? "600" : "500",
                  },
                ]}
                numberOfLines={1}
              >
                {activeWorkspace.name} ({activeWorkspace.currencyCode})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                haptics.light();
                setScope("all");
              }}
              style={[
                styles.scopeBtn,
                scope === "all" && { backgroundColor: colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.scopeText,
                  {
                    color: scope === "all" ? colors.textPrimary : colors.textMuted,
                    fontWeight: scope === "all" ? "600" : "500",
                  },
                ]}
                numberOfLines={1}
              >
                All Accounts ({user?.defaultCurrencyCode || "USD"})
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {isLoading && !report ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Calculating cash flow report...
            </Text>
          </View>
        ) : error ? (
          <Card style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.textPrimary }]}>{error}</Text>
            <Button title="Retry" size="sm" onPress={handleRefresh} />
          </Card>
        ) : report ? (
          <>
            {/* 2x2 KPI Summary Grid */}
            <View style={styles.kpiGrid}>
              <Card style={styles.kpiCard}>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>INCOME</Text>
                <Text
                  style={[
                    styles.kpiValue,
                    { color: colors.accent, fontVariant: ["tabular-nums"] },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {fmt(report.totalIncome, reportCurrency)}
                </Text>
              </Card>

              <Card style={styles.kpiCard}>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>EXPENSE</Text>
                <Text
                  style={[
                    styles.kpiValue,
                    { color: colors.textPrimary, fontVariant: ["tabular-nums"] },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {fmt(report.totalExpense, reportCurrency)}
                </Text>
              </Card>

              <Card style={styles.kpiCard}>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>NET CASH FLOW</Text>
                <Text
                  style={[
                    styles.kpiValue,
                    {
                      color: netPositive ? colors.accent : colors.danger,
                      fontVariant: ["tabular-nums"],
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {hideBalance
                    ? "••••••"
                    : `${netPositive ? "+" : ""}${formatMoney(report.netCashFlow, reportCurrency)}`}
                </Text>
              </Card>

              <Card style={styles.kpiCard}>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>SAVINGS RATE</Text>
                <Text
                  style={[
                    styles.kpiValue,
                    {
                      color:
                        report.savingsRatePercent >= 0 ? colors.accent : colors.danger,
                      fontVariant: ["tabular-nums"],
                    },
                  ]}
                >
                  {report.savingsRatePercent.toFixed(1)}%
                </Text>
              </Card>
            </View>

            {/* Excluded Transfers Note */}
            {report.totalTransfersExcluded > 0 ? (
              <View
                style={[
                  styles.transferNote,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                ]}
              >
                <Ionicons name="swap-horizontal-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.transferNoteText, { color: colors.textSecondary }]}>
                  Account transfers excluded from income & expenses:{" "}
                  <Text style={{ fontWeight: "700", fontVariant: ["tabular-nums"] }}>
                    {fmt(report.totalTransfersExcluded, reportCurrency)}
                  </Text>
                </Text>
              </View>
            ) : null}

            {/* Breakdown Header & Toggle */}
            <View style={styles.breakdownHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Category Breakdown
              </Text>
              <View
                style={[
                  styles.tabSwitch,
                  { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    haptics.light();
                    setBreakdownTab("expense");
                  }}
                  style={[
                    styles.tabBtn,
                    breakdownTab === "expense" && { backgroundColor: colors.surface },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBtnText,
                      {
                        color:
                          breakdownTab === "expense" ? colors.textPrimary : colors.textMuted,
                      },
                    ]}
                  >
                    Expenses ({report.expenseByCategory?.length || 0})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    haptics.light();
                    setBreakdownTab("income");
                  }}
                  style={[
                    styles.tabBtn,
                    breakdownTab === "income" && { backgroundColor: colors.surface },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBtnText,
                      {
                        color:
                          breakdownTab === "income" ? colors.textPrimary : colors.textMuted,
                      },
                    ]}
                  >
                    Income ({report.incomeByCategory?.length || 0})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Category Breakdown List */}
            {activeItems.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="bar-chart-outline" size={28} color={colors.textDisabled} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  No {breakdownTab} activity in this period
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  Try selecting a wider date range or switching accounts.
                </Text>
              </Card>
            ) : (
              <Card style={styles.breakdownCard}>
                {activeItems.map((item, idx) => {
                  const barColor = item.colorHex || colors.accent;
                  const widthPct = Math.min(100, Math.max(4, item.sharePercent));
                  const isLast = idx === activeItems.length - 1;

                  return (
                    <View
                      key={`${item.categoryId || item.categoryName}-${idx}`}
                      style={[
                        styles.breakdownRow,
                        !isLast && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      <View style={styles.breakdownTop}>
                        <View style={styles.breakdownNameWrap}>
                          <View style={[styles.colorDot, { backgroundColor: barColor }]} />
                          <Text
                            style={[styles.categoryName, { color: colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {item.categoryName}
                          </Text>
                          <Text style={[styles.txnCount, { color: colors.textMuted }]}>
                            {item.transactionCount} {item.transactionCount === 1 ? "txn" : "txns"}
                          </Text>
                        </View>
                        <View style={styles.breakdownAmountWrap}>
                          <Text
                            style={[
                              styles.categoryAmount,
                              { color: colors.textPrimary, fontVariant: ["tabular-nums"] },
                            ]}
                          >
                            {fmt(item.totalAmount, item.currencyCode || reportCurrency)}
                          </Text>
                          <Text
                            style={[
                              styles.categoryPct,
                              { color: colors.textMuted, fontVariant: ["tabular-nums"] },
                            ]}
                          >
                            {item.sharePercent.toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.barTrack, { backgroundColor: colors.surfaceMuted }]}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${widthPct}%`, backgroundColor: barColor },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </Card>
            )}
          </>
        ) : null}
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
    paddingTop: spacing.md,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  periodChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: "center",
  },
  periodChipText: {
    ...typography.caption,
    fontWeight: "600",
  },
  scopeSegment: {
    flexDirection: "row",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 3,
    marginBottom: spacing.base,
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
    minHeight: 36,
    justifyContent: "center",
  },
  scopeText: {
    ...typography.caption,
  },
  centerBox: {
    paddingVertical: spacing.huge,
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
  },
  errorCard: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  errorText: {
    ...typography.body,
    textAlign: "center",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiCard: {
    width: "48.8%",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  kpiLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  kpiValue: {
    ...typography.title,
    marginTop: 4,
  },
  transferNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  transferNoteText: {
    ...typography.caption,
    flex: 1,
  },
  breakdownHeader: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.title,
  },
  tabSwitch: {
    flexDirection: "row",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radius.sm,
    minHeight: 36,
    justifyContent: "center",
  },
  tabBtnText: {
    ...typography.caption,
    fontWeight: "600",
  },
  breakdownCard: {
    padding: 0,
    overflow: "hidden",
  },
  breakdownRow: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  breakdownTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  breakdownNameWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    ...typography.label,
    flexShrink: 1,
  },
  txnCount: {
    ...typography.caption,
  },
  breakdownAmountWrap: {
    alignItems: "flex-end",
  },
  categoryAmount: {
    ...typography.label,
    fontWeight: "700",
  },
  categoryPct: {
    ...typography.caption,
  },
  barTrack: {
    height: 6,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.label,
    marginTop: spacing.xs,
  },
  emptySubtitle: {
    ...typography.caption,
    textAlign: "center",
  },
});
