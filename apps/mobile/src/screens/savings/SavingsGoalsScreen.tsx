import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { StackHeader } from "@/components/shared/StackHeader";
import { savingsGoalsApi } from "@/api/savingsGoals";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useTheme } from "@/context/ThemeContext";
import { SavingsGoalResponse } from "@/types/api";
import {
  SUPPORTED_CURRENCIES,
  SupportedCurrencyCode,
  formatMoney,
} from "@/utils/currency";
import { radius, spacing, typography } from "@/theme/tokens";
import { haptics } from "@/utils/haptics";

export const SavingsGoalsScreen: React.FC = () => {
  const { user } = useAuth();
  const { activeWorkspace, hideBalance, refetchAll } = useWorkspace();
  const { colors } = useTheme();

  const [goals, setGoals] = useState<SavingsGoalResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create modal state
  const [createVisible, setCreateVisible] = useState(false);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [initialAmount, setInitialAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [linkActiveAccount, setLinkActiveAccount] = useState(Boolean(activeWorkspace));
  const [currencyCode, setCurrencyCode] = useState<SupportedCurrencyCode>(
    (activeWorkspace?.currencyCode as SupportedCurrencyCode) ||
      (user?.defaultCurrencyCode as SupportedCurrencyCode) ||
      "USD"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Adjust modal state
  const [adjustGoal, setAdjustGoal] = useState<SavingsGoalResponse | null>(null);
  const [adjustIsWithdraw, setAdjustIsWithdraw] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");

  const loadGoals = useCallback(async () => {
    try {
      const data = await savingsGoalsApi.getSavingsGoals(activeWorkspace?.id);
      setGoals(data);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to load savings goals.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeWorkspace?.id]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadGoals();
    }, [loadGoals])
  );

  const summary = useMemo(() => {
    const completed = goals.filter((g) => g.progressPercent >= 100).length;
    const baseCurrency =
      activeWorkspace?.currencyCode ||
      goals[0]?.currencyCode ||
      user?.defaultCurrencyCode ||
      "USD";
    const matchingCurrencyGoals = goals.filter(
      (g) => g.currencyCode.toUpperCase() === baseCurrency.toUpperCase()
    );
    const totalSaved = matchingCurrencyGoals.reduce((acc, g) => acc + g.currentAmount, 0);
    const totalTarget = matchingCurrencyGoals.reduce((acc, g) => acc + g.targetAmount, 0);
    const overallPct = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;

    return {
      completed,
      total: goals.length,
      baseCurrency,
      totalSaved,
      totalTarget,
      overallPct,
      hasSingleCurrency: matchingCurrencyGoals.length === goals.length,
    };
  }, [goals, activeWorkspace?.currencyCode, user?.defaultCurrencyCode]);

  const openCreateModal = () => {
    setName("");
    setTargetAmount("");
    setInitialAmount("");
    setTargetDate("");
    setLinkActiveAccount(Boolean(activeWorkspace));
    setCurrencyCode(
      ((activeWorkspace?.currencyCode ||
        user?.defaultCurrencyCode ||
        "USD") as SupportedCurrencyCode)
    );
    setCreateVisible(true);
  };

  const handleCreateGoal = async () => {
    const trimmedName = name.trim();
    const targetNum = parseFloat(targetAmount);
    const initialNum = initialAmount.trim() ? parseFloat(initialAmount) : 0;

    if (!trimmedName) {
      Alert.alert("Missing Name", "Please enter a name for your savings goal.");
      return;
    }
    if (!Number.isFinite(targetNum) || targetNum <= 0) {
      Alert.alert("Invalid Target", "Target amount must be greater than zero.");
      return;
    }
    if (initialAmount.trim() && (!Number.isFinite(initialNum) || initialNum < 0)) {
      Alert.alert("Invalid Initial Amount", "Initial amount cannot be negative.");
      return;
    }
    if (targetDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate.trim())) {
      Alert.alert("Invalid Date", "Please use YYYY-MM-DD format for the target date.");
      return;
    }

    setIsSubmitting(true);
    try {
      const effectiveAccount = linkActiveAccount ? activeWorkspace : null;
      await savingsGoalsApi.createSavingsGoal({
        name: trimmedName,
        targetAmount: targetNum,
        currencyCode: effectiveAccount ? effectiveAccount.currencyCode : currencyCode,
        initialAmount: initialNum > 0 ? initialNum : undefined,
        targetDate: targetDate.trim() || null,
        accountId: effectiveAccount?.id || null,
      });
      haptics.success();
      setCreateVisible(false);
      await loadGoals();
      await refetchAll();
    } catch (err: any) {
      Alert.alert("Could Not Create Goal", err?.message || "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAdjustModal = (goal: SavingsGoalResponse, isWithdraw: boolean) => {
    haptics.light();
    setAdjustGoal(goal);
    setAdjustIsWithdraw(isWithdraw);
    setAdjustAmount("");
  };

  const handleAdjustGoal = async () => {
    if (!adjustGoal) return;
    const amt = parseFloat(adjustAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      Alert.alert("Invalid Amount", "Please enter a positive amount.");
      return;
    }
    if (adjustIsWithdraw && amt > adjustGoal.currentAmount) {
      Alert.alert(
        "Insufficient Goal Balance",
        `Available in this goal is ${formatMoney(adjustGoal.currentAmount, adjustGoal.currencyCode)}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await savingsGoalsApi.adjustSavingsGoal(adjustGoal.id, {
        amount: amt,
        isWithdrawal: adjustIsWithdraw,
      });
      haptics.success();
      setAdjustGoal(null);
      await loadGoals();
      await refetchAll();
    } catch (err: any) {
      Alert.alert("Update Failed", err?.message || "Could not update goal balance.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteGoal = (goal: SavingsGoalResponse) => {
    Alert.alert(
      "Delete Savings Goal",
      `Are you sure you want to delete "${goal.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await savingsGoalsApi.deleteSavingsGoal(goal.id);
              haptics.success();
              await loadGoals();
              await refetchAll();
            } catch (err: any) {
              Alert.alert("Delete Failed", err?.message || "Unable to delete goal.");
            }
          },
        },
      ]
    );
  };

  const fmt = (amount: number, code: string) =>
    hideBalance ? "••••••" : formatMoney(amount, code);

  return (
    <ScreenWrapper>
      <StackHeader
        title="Savings Goals"
        subtitle={activeWorkspace ? activeWorkspace.name : "All Accounts"}
        rightAction={
          <TouchableOpacity
            onPress={() => {
              haptics.light();
              openCreateModal();
            }}
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
            accessibilityLabel="Create savings goal"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={20} color={colors.accentForeground} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              void loadGoals();
            }}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.container}>
        {/* Summary Card */}
        {goals.length > 0 ? (
          <Card variant="subtle" style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View>
                <Text style={[styles.summaryKicker, { color: colors.textMuted }]}>
                  GOALS PROGRESS
                </Text>
                <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
                  {summary.completed} of {summary.total} Completed
                </Text>
              </View>
              {summary.hasSingleCurrency ? (
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={[
                      styles.summaryAmount,
                      { color: colors.accent, fontVariant: ["tabular-nums"] },
                    ]}
                  >
                    {fmt(summary.totalSaved, summary.baseCurrency)}
                  </Text>
                  <Text
                    style={[
                      styles.summaryTarget,
                      { color: colors.textMuted, fontVariant: ["tabular-nums"] },
                    ]}
                  >
                    of {fmt(summary.totalTarget, summary.baseCurrency)}
                  </Text>
                </View>
              ) : null}
            </View>
            {summary.hasSingleCurrency ? (
              <View style={[styles.barTrack, { backgroundColor: colors.borderSubtle }]}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${summary.overallPct}%`, backgroundColor: colors.accent },
                  ]}
                />
              </View>
            ) : null}
          </Card>
        ) : null}

        {isLoading && goals.length === 0 ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : goals.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="flag-outline" size={28} color={colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No Savings Goals Yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Set targets for emergency funds, travel, or major purchases and track progress over time.
            </Text>
            <Button
              title="Create First Goal"
              onPress={openCreateModal}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        ) : (
          goals.map((goal) => {
            const pct = Math.min(100, Math.max(0, goal.progressPercent));
            const isCompleted = goal.progressPercent >= 100;

            return (
              <Card key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.goalName, { color: colors.textPrimary }]}>
                      {goal.name}
                    </Text>
                    <View style={styles.goalBadges}>
                      <Badge
                        label={goal.accountName || "General Goal"}
                        variant="outline"
                      />
                      {goal.targetDate ? (
                        <Badge
                          label={`Target ${goal.targetDate.slice(0, 10)}`}
                          variant="default"
                        />
                      ) : null}
                      {isCompleted ? <Badge label="Funded" variant="success" /> : null}
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => confirmDeleteGoal(goal)}
                    style={styles.deleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={`Delete ${goal.name}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.amountsRow}>
                  <View>
                    <Text
                      style={[
                        styles.currentAmt,
                        { color: colors.textPrimary, fontVariant: ["tabular-nums"] },
                      ]}
                    >
                      {fmt(goal.currentAmount, goal.currencyCode)}
                    </Text>
                    <Text
                      style={[
                        styles.targetAmt,
                        { color: colors.textMuted, fontVariant: ["tabular-nums"] },
                      ]}
                    >
                      of {fmt(goal.targetAmount, goal.currencyCode)} goal
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.pctText,
                      { color: colors.accent, fontVariant: ["tabular-nums"] },
                    ]}
                  >
                    {pct.toFixed(0)}%
                  </Text>
                </View>

                <View style={[styles.barTrack, { backgroundColor: colors.surfaceMuted }]}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${pct}%`, backgroundColor: colors.accent },
                    ]}
                  />
                </View>

                {!isCompleted ? (
                  <Text
                    style={[
                      styles.remainingText,
                      { color: colors.textMuted, fontVariant: ["tabular-nums"] },
                    ]}
                  >
                    {fmt(Math.max(0, goal.remainingAmount), goal.currencyCode)} remaining
                  </Text>
                ) : null}

                <View style={styles.actionsRow}>
                  <Button
                    title="+ Contribute"
                    variant="primary"
                    size="sm"
                    onPress={() => openAdjustModal(goal, false)}
                    style={styles.actionBtn}
                  />
                  <Button
                    title="Withdraw"
                    variant="secondary"
                    size="sm"
                    disabled={goal.currentAmount <= 0}
                    onPress={() => openAdjustModal(goal, true)}
                    style={styles.actionBtn}
                  />
                </View>
              </Card>
            );
          })
        )}
        </View>
      </ScrollView>

      {/* Create Goal Modal */}
      <ModalSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        title="New Savings Goal"
        subtitle="Track progress toward a dedicated savings target"
        maxHeightRatio={0.9}
        footer={
          <Button
            title="Create Goal"
            onPress={handleCreateGoal}
            isLoading={isSubmitting}
          />
        }
      >
        <View style={styles.modalBody}>
          <Input
            label="Goal Name"
            placeholder="e.g., Emergency Fund, Japan Trip"
            value={name}
            onChangeText={setName}
            containerStyle={{ marginBottom: 0 }}
          />
          <Input
            label="Target Amount"
            placeholder="0.00"
            keyboardType="decimal-pad"
            currencyCode={
              linkActiveAccount && activeWorkspace
                ? activeWorkspace.currencyCode
                : currencyCode
            }
            value={targetAmount}
            onChangeText={setTargetAmount}
            containerStyle={{ marginBottom: 0 }}
          />
          <Input
            label="Initial Saved Amount (Optional)"
            placeholder="0.00"
            keyboardType="decimal-pad"
            currencyCode={
              linkActiveAccount && activeWorkspace
                ? activeWorkspace.currencyCode
                : currencyCode
            }
            value={initialAmount}
            onChangeText={setInitialAmount}
            containerStyle={{ marginBottom: 0 }}
          />
          <Input
            label="Target Date (Optional, YYYY-MM-DD)"
            placeholder="e.g., 2026-12-31"
            value={targetDate}
            onChangeText={setTargetDate}
            autoCapitalize="none"
            containerStyle={{ marginBottom: 0 }}
          />

          {activeWorkspace ? (
            <View
              style={[
                styles.switchRow,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>
                  Link to {activeWorkspace.name}
                </Text>
                <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                  Uses {activeWorkspace.currencyCode} and shows inside this account
                </Text>
              </View>
              <Switch
                value={linkActiveAccount}
                onValueChange={setLinkActiveAccount}
                trackColor={{ false: colors.border, true: colors.accent }}
              />
            </View>
          ) : null}

          {!linkActiveAccount || !activeWorkspace ? (
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Currency
              </Text>
              <View style={styles.currencyGrid}>
                {SUPPORTED_CURRENCIES.map((code) => {
                  const selected = currencyCode === code;
                  return (
                    <TouchableOpacity
                      key={code}
                      onPress={() => {
                        haptics.light();
                        setCurrencyCode(code);
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
          ) : null}
        </View>
      </ModalSheet>

      {/* Contribute / Withdraw Modal */}
      <ModalSheet
        visible={Boolean(adjustGoal)}
        onClose={() => setAdjustGoal(null)}
        title={adjustIsWithdraw ? "Withdraw from Goal" : "Contribute to Goal"}
        subtitle={
          adjustGoal
            ? `${adjustGoal.name} · Balance ${formatMoney(
                adjustGoal.currentAmount,
                adjustGoal.currencyCode
              )}`
            : undefined
        }
        maxHeightRatio={0.82}
        footer={
          adjustGoal ? (
            <Button
              title={adjustIsWithdraw ? "Confirm Withdrawal" : "Add Contribution"}
              variant={adjustIsWithdraw ? "danger" : "primary"}
              onPress={handleAdjustGoal}
              isLoading={isSubmitting}
            />
          ) : null
        }
      >
        {adjustGoal ? (
          <View style={styles.modalBody}>
            <Input
              label={adjustIsWithdraw ? "Amount to Withdraw" : "Amount to Add"}
              placeholder="0.00"
              keyboardType="decimal-pad"
              currencyCode={adjustGoal.currencyCode}
              value={adjustAmount}
              onChangeText={setAdjustAmount}
              containerStyle={{ marginBottom: 0 }}
            />

            <View style={styles.quickChipRow}>
              {!adjustIsWithdraw ? (
                <>
                  {[100, 500, 1000].map((val) => (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setAdjustAmount(String(val))}
                      style={[
                        styles.quickChip,
                        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.quickChipText, { color: colors.textPrimary }]}>
                        +{val}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {adjustGoal.remainingAmount > 0 ? (
                    <TouchableOpacity
                      onPress={() =>
                        setAdjustAmount(String(adjustGoal.remainingAmount.toFixed(2)))
                      }
                      style={[
                        styles.quickChip,
                        { backgroundColor: colors.accentSoft, borderColor: colors.accent },
                      ]}
                    >
                      <Text style={[styles.quickChipText, { color: colors.accent }]}>
                        Fill Remaining
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : (
                <TouchableOpacity
                  onPress={() =>
                    setAdjustAmount(String(adjustGoal.currentAmount.toFixed(2)))
                  }
                  style={[
                    styles.quickChip,
                    { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.quickChipText, { color: colors.textPrimary }]}>
                    Max ({formatMoney(adjustGoal.currentAmount, adjustGoal.currencyCode)})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : null}
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryKicker: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  summaryTitle: {
    ...typography.title,
    marginTop: 2,
  },
  summaryAmount: {
    ...typography.title,
  },
  summaryTarget: {
    ...typography.caption,
  },
  centerBox: {
    paddingVertical: spacing.huge,
    alignItems: "center",
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typography.title,
  },
  emptySubtitle: {
    ...typography.body,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
  goalCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  goalName: {
    ...typography.bodyLarge,
    fontWeight: "700",
  },
  goalBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  amountsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: spacing.xs,
  },
  currentAmt: {
    ...typography.title,
    fontWeight: "700",
  },
  targetAmt: {
    ...typography.caption,
  },
  pctText: {
    ...typography.title,
    fontWeight: "700",
  },
  barTrack: {
    height: 8,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  remainingText: {
    ...typography.caption,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    minHeight: 40,
  },
  modalBody: {
    gap: spacing.md,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  switchLabel: {
    ...typography.label,
  },
  switchSub: {
    ...typography.caption,
    marginTop: 2,
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
  quickChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  quickChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  quickChipText: {
    ...typography.caption,
    fontWeight: "600",
  },
});
