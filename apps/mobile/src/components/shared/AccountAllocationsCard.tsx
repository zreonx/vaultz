import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { PressableScale } from '@/components/ui/PressableScale';
import { accountAllocationsApi } from '@/api/accountAllocations';
import { useTheme } from '@/context/ThemeContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { typography, radius, spacing } from '@/theme/tokens';
import {
  formatMoney,
  CURRENCY_METADATA,
  type SupportedCurrencyCode,
} from '@/utils/currency';
import { haptics } from '@/utils/haptics';
import {
  AccountAllocationDto,
  AccountAllocationsOverviewResponse,
  AllocationCategory,
  MonthlyBudgetPlanDto,
} from '@/types/api';

const SLICE_PALETTE = ['#2A6B58', '#3B82F6', '#D97706', '#8B5CF6', '#0EA5E9', '#E06C6C'];

const VAULT_CATEGORIES: { value: AllocationCategory; label: string }[] = [
  { value: AllocationCategory.Emergency, label: 'Emergency' },
  { value: AllocationCategory.Savings, label: 'Savings' },
  { value: AllocationCategory.Bills, label: 'Bills' },
  { value: AllocationCategory.Custom, label: 'Custom' },
];

function formatCleanNumber(num: number): string {
  if (isNaN(num) || num <= 0) return '';
  const rounded = Math.round(num * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

interface AccountAllocationsCardProps {
  accountId: string;
  accountName: string;
  currencyCode: string;
  refreshTrigger?: number;
  onRefreshParent?: () => void;
}

export const AccountAllocationsCard: React.FC<AccountAllocationsCardProps> = ({
  accountId,
  accountName,
  currencyCode,
  refreshTrigger = 0,
  onRefreshParent,
}) => {
  const { colors, isDark } = useTheme();
  const { hideBalance } = useWorkspace();

  const [overview, setOverview] = useState<AccountAllocationsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [createVaultVisible, setCreateVaultVisible] = useState(false);
  const [transferModal, setTransferModal] = useState<{
    mode: 'deposit' | 'withdraw';
    allocation: AccountAllocationDto;
  } | null>(null);
  const [createPlanVisible, setCreatePlanVisible] = useState(false);
  const [coverDeficitVisible, setCoverDeficitVisible] = useState(false);
  const [sweepVisible, setSweepVisible] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      const data = await accountAllocationsApi.getOverview(accountId);
      setOverview(data);
    } catch {
      // Offline / transient fallback: keep existing state if available
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    setLoading((prev) => (overview ? prev : true));
    void fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOverview, refreshTrigger]);

  if (loading && !overview) {
    return (
      <Card variant="surface" style={styles.loadingCard}>
        <ActivityIndicator color={colors.accent} />
      </Card>
    );
  }

  if (!overview) {
    return (
      <Card variant="surface" style={styles.emptyBox}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Unable to load monthly finance data for {accountName}. Pull down to retry.
        </Text>
      </Card>
    );
  }

  const {
    accountBalance,
    totalAllocatedInVaults,
    activePlanRemaining,
    unallocatedBalance,
    allocations,
    activeBudgetPlan,
  } = overview;

  const planColor = isDark ? '#60A5FA' : '#2563EB';
  const planSoft = isDark ? 'rgba(59, 130, 246, 0.14)' : 'rgba(37, 99, 235, 0.08)';
  const planBorder = isDark ? 'rgba(96, 165, 250, 0.28)' : 'rgba(37, 99, 235, 0.2)';
  const trackBg = isDark ? colors.surfaceSubtle : colors.surfaceMuted;

  return (
    <View style={styles.container}>
      {/* Partition Overview Card */}
      <Card variant="surface" style={styles.card}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.accountLabel, { color: colors.textMuted }]}>
              {accountName.toUpperCase()} • {currencyCode}
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Balance Allocation
            </Text>
          </View>
          <View style={styles.totalPill}>
            <Text style={[styles.totalPillLabel, { color: colors.textMuted }]}>
              Total Balance
            </Text>
            <Text style={[styles.totalPillVal, { color: colors.textPrimary }]}>
              {hideBalance ? '••••' : formatMoney(accountBalance, currencyCode)}
            </Text>
          </View>
        </View>

        {/* 3 Partition Metrics */}
        <View style={styles.metricsGrid}>
          <View
            style={[
              styles.metricBox,
              { backgroundColor: colors.accentSoft, borderColor: colors.borderSubtle },
            ]}
          >
            <View style={styles.metricHeader}>
              <Ionicons name="shield-checkmark-outline" size={13} color={colors.accent} />
              <Text style={[styles.metricLabel, { color: colors.accent }]}>Vaults</Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {hideBalance ? '••••' : formatMoney(totalAllocatedInVaults, currencyCode)}
            </Text>
          </View>

          <View
            style={[
              styles.metricBox,
              { backgroundColor: planSoft, borderColor: colors.borderSubtle },
            ]}
          >
            <View style={styles.metricHeader}>
              <Ionicons name="pie-chart-outline" size={13} color={planColor} />
              <Text style={[styles.metricLabel, { color: planColor }]}>Budget Left</Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {hideBalance ? '••••' : formatMoney(activePlanRemaining, currencyCode)}
            </Text>
          </View>

          <View
            style={[
              styles.metricBox,
              { backgroundColor: colors.warningSoft, borderColor: colors.borderSubtle },
            ]}
          >
            <View style={styles.metricHeader}>
              <Ionicons name="wallet-outline" size={13} color={colors.warning} />
              <Text style={[styles.metricLabel, { color: colors.warning }]}>Available</Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {hideBalance ? '••••' : formatMoney(unallocatedBalance, currencyCode)}
            </Text>
          </View>
        </View>

        {/* Visual Partition Bar */}
        {accountBalance > 0 && (
          <View style={styles.barContainer}>
            <View style={[styles.barTrack, { backgroundColor: trackBg }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: colors.accent,
                    width: `${Math.min(100, Math.max(0, (totalAllocatedInVaults / accountBalance) * 100))}%`,
                  },
                ]}
              />
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: planColor,
                    width: `${Math.min(100, Math.max(0, (activePlanRemaining / accountBalance) * 100))}%`,
                  },
                ]}
              />
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: colors.warning,
                    width: `${Math.min(100, Math.max(0, (unallocatedBalance / accountBalance) * 100))}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}
      </Card>

      {/* PURPOSE VAULTS */}
      <Card variant="surface" style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <Ionicons name="shield-outline" size={18} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Purpose Vaults
            </Text>
          </View>
          <PressableScale
            onPress={() => {
              haptics.light();
              setCreateVaultVisible(true);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.addBtn, { backgroundColor: colors.accentSoft }]}
          >
            <Ionicons name="add" size={15} color={colors.accent} />
            <Text style={[styles.addBtnText, { color: colors.accent }]}>New Vault</Text>
          </PressableScale>
        </View>

        {allocations.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No purpose vaults created yet. Protect savings or earmarked reserves from daily spending.
            </Text>
          </View>
        ) : (
          <View style={styles.vaultsList}>
            {allocations.map((alloc) => {
              const target = alloc.targetAmount ?? 0;
              const hasTarget = target > 0;
              const targetPct = hasTarget
                ? Math.min(100, Math.round((alloc.balance / target) * 100))
                : 0;

              return (
                <View
                  key={alloc.id}
                  style={[
                    styles.vaultItem,
                    {
                      borderColor: colors.borderSubtle,
                      backgroundColor: isDark ? colors.surfaceSubtle : colors.background,
                    },
                  ]}
                >
                  <View style={styles.vaultTopRow}>
                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <Text style={[styles.vaultName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {alloc.name}
                      </Text>
                      <Badge label={alloc.categoryName} variant="outline" style={styles.categoryBadge} />
                    </View>
                    <View style={styles.vaultRightCol}>
                      <Text style={[styles.vaultBalance, { color: colors.textPrimary }]}>
                        {hideBalance ? '••••' : formatMoney(alloc.balance, currencyCode)}
                      </Text>
                      {hasTarget && (
                        <Text style={[styles.vaultTargetText, { color: colors.textMuted }]}>
                          of {hideBalance ? '••••' : formatMoney(target, currencyCode)} ({targetPct}%)
                        </Text>
                      )}
                    </View>
                  </View>

                  {hasTarget && (
                    <View style={[styles.sliceProgressTrack, { backgroundColor: trackBg, marginTop: spacing.sm }]}>
                      <View
                        style={[
                          styles.sliceProgressFill,
                          {
                            backgroundColor: colors.accent,
                            width: `${targetPct}%`,
                          },
                        ]}
                      />
                    </View>
                  )}

                  <View style={styles.vaultActionsRow}>
                    <PressableScale
                      onPress={() => {
                        haptics.selection();
                        setTransferModal({ mode: 'deposit', allocation: alloc });
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      style={[styles.actionChip, { backgroundColor: colors.accentSoft }]}
                    >
                      <Ionicons name="arrow-down-outline" size={13} color={colors.accent} />
                      <Text style={[styles.actionChipText, { color: colors.accent }]}>Deposit</Text>
                    </PressableScale>

                    <PressableScale
                      onPress={() => {
                        haptics.selection();
                        setTransferModal({ mode: 'withdraw', allocation: alloc });
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      style={[styles.actionChip, { backgroundColor: colors.warningSoft }]}
                    >
                      <Ionicons name="arrow-up-outline" size={13} color={colors.warning} />
                      <Text style={[styles.actionChipText, { color: colors.warning }]}>Withdraw</Text>
                    </PressableScale>

                    <PressableScale
                      onPress={() => {
                        Alert.alert(
                          `Delete ${alloc.name}?`,
                          `Any remaining funds (${formatMoney(alloc.balance, currencyCode)}) will return to your available balance.`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  await accountAllocationsApi.deleteAllocation(accountId, alloc.id);
                                  haptics.success();
                                  await fetchOverview();
                                  if (onRefreshParent) onRefreshParent();
                                } catch (err: any) {
                                  haptics.error();
                                  Alert.alert('Error', err?.message || 'Failed to delete vault');
                                }
                              },
                            },
                          ]
                        );
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.deleteIconBtn}
                      accessibilityLabel={`Delete ${alloc.name}`}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                    </PressableScale>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* MONTHLY BUDGET PLAN */}
      <Card variant="surface" style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <Ionicons name="pie-chart-outline" size={18} color={planColor} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Monthly Budget Plan
            </Text>
          </View>

          {activeBudgetPlan ? (
            <View style={styles.planBtnRow}>
              <PressableScale
                onPress={() => {
                  haptics.light();
                  setCoverDeficitVisible(true);
                }}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                style={[styles.smallActionBtn, { borderColor: planColor }]}
              >
                <Ionicons name="swap-horizontal" size={13} color={planColor} />
                <Text style={[styles.smallActionText, { color: planColor }]}>Rebalance</Text>
              </PressableScale>

              <PressableScale
                onPress={() => {
                  haptics.light();
                  setSweepVisible(true);
                }}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                style={[styles.smallActionBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
              >
                <Ionicons name="refresh" size={13} color={colors.accentForeground} />
                <Text style={[styles.smallActionText, { color: colors.accentForeground }]}>Sweep</Text>
              </PressableScale>
            </View>
          ) : (
            <PressableScale
              onPress={() => {
                haptics.light();
                setCreatePlanVisible(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[styles.addBtn, { backgroundColor: planSoft }]}
            >
              <Ionicons name="add" size={15} color={planColor} />
              <Text style={[styles.addBtnText, { color: planColor }]}>Setup</Text>
            </PressableScale>
          )}
        </View>

        {!activeBudgetPlan ? (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No active monthly plan. Split your monthly budget (50/30/20 or custom slices) for disciplined spending.
            </Text>
            <Button
              title="Create Monthly Plan"
              variant="secondary"
              size="sm"
              onPress={() => setCreatePlanVisible(true)}
              style={{ marginTop: spacing.md }}
            />
          </View>
        ) : (
          <View style={styles.planContent}>
            <View
              style={[
                styles.planSummaryBox,
                { backgroundColor: planSoft, borderColor: planBorder },
              ]}
            >
              <View style={styles.planSummaryTopRow}>
                <View style={styles.cycleBadge}>
                  <View style={[styles.pulseDot, { backgroundColor: planColor }]} />
                  <Text style={[styles.planPeriodText, { color: planColor }]}>
                    Cycle {activeBudgetPlan.year}-{String(activeBudgetPlan.month).padStart(2, '0')}
                  </Text>
                </View>
                <PressableScale
                  onPress={() => {
                    Alert.alert(
                      'Close Monthly Plan?',
                      'Unspent funds will safely return to available balance.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Close Plan',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await accountAllocationsApi.closePlan(accountId, activeBudgetPlan.id);
                              haptics.success();
                              await fetchOverview();
                              if (onRefreshParent) onRefreshParent();
                            } catch (err: any) {
                              haptics.error();
                              Alert.alert('Error', err?.message || 'Failed to close plan');
                            }
                          },
                        },
                      ]
                    );
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.closePlanBtn}
                >
                  <Text style={[styles.closePlanBtnText, { color: colors.textSecondary }]}>Close</Text>
                </PressableScale>
              </View>

              <Text style={[styles.planRemainingText, { color: colors.textPrimary }]}>
                {hideBalance ? '••••' : formatMoney(activeBudgetPlan.totalRemaining, currencyCode)} remaining
              </Text>
              <Text style={[styles.planBudgetText, { color: colors.textSecondary }]}>
                Spent {hideBalance ? '••••' : formatMoney(activeBudgetPlan.totalSpent, currencyCode)} of{' '}
                {hideBalance ? '••••' : formatMoney(activeBudgetPlan.totalBudgetAmount, currencyCode)} (
                {activeBudgetPlan.totalBudgetAmount > 0
                  ? Math.round((activeBudgetPlan.totalSpent / activeBudgetPlan.totalBudgetAmount) * 100)
                  : 0}
                %)
              </Text>

              <View
                style={[
                  styles.sliceProgressTrack,
                  { backgroundColor: trackBg, height: 6, borderRadius: 3, marginTop: 8, width: '100%' },
                ]}
              >
                <View
                  style={[
                    styles.sliceProgressFill,
                    {
                      backgroundColor: planColor,
                      width: `${
                        activeBudgetPlan.totalBudgetAmount > 0
                          ? Math.min(100, Math.round((activeBudgetPlan.totalSpent / activeBudgetPlan.totalBudgetAmount) * 100))
                          : 0
                      }%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Slices */}
            <View style={styles.slicesList}>
              {activeBudgetPlan.slices.map((slice, idx) => {
                const pctSpent =
                  slice.allocatedAmount > 0
                    ? Math.min(100, Math.round((slice.spentAmount / slice.allocatedAmount) * 100))
                    : 0;
                const isExhausted = slice.remainingAmount <= 0;
                const dotColor = SLICE_PALETTE[idx % SLICE_PALETTE.length] ?? colors.accent;

                return (
                  <View
                    key={slice.id}
                    style={[
                      styles.sliceCard,
                      {
                        borderColor: isExhausted ? colors.danger : colors.borderSubtle,
                        backgroundColor: isExhausted
                          ? colors.dangerSoft
                          : isDark
                          ? colors.surfaceSubtle
                          : colors.background,
                      },
                    ]}
                  >
                    <View style={styles.sliceHeader}>
                      <View style={styles.sliceNameRow}>
                        <View style={[styles.sliceDot, { backgroundColor: dotColor }]} />
                        <Text style={[styles.sliceName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {slice.name}
                        </Text>
                        <Badge label={`${slice.allocationPercentage}%`} variant="outline" />
                      </View>
                      <Text
                        style={[
                          styles.sliceRemaining,
                          { color: isExhausted ? colors.danger : colors.textPrimary },
                        ]}
                      >
                        {hideBalance ? '••••' : formatMoney(slice.remainingAmount, currencyCode)}
                      </Text>
                    </View>

                    <View style={[styles.sliceProgressTrack, { backgroundColor: trackBg }]}>
                      <View
                        style={[
                          styles.sliceProgressFill,
                          {
                            backgroundColor: isExhausted
                              ? colors.danger
                              : pctSpent > 80
                              ? colors.warning
                              : dotColor,
                            width: `${pctSpent}%`,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.sliceBottomRow}>
                      <Text style={[styles.sliceSubtext, { color: colors.textMuted }]}>
                        Spent {hideBalance ? '••••' : formatMoney(slice.spentAmount, currencyCode)} of{' '}
                        {hideBalance ? '••••' : formatMoney(slice.allocatedAmount, currencyCode)}
                      </Text>
                      {isExhausted && (
                        <PressableScale
                          onPress={() => {
                            haptics.light();
                            setCoverDeficitVisible(true);
                          }}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Text style={[styles.deficitLinkText, { color: colors.danger }]}>
                            Cover Deficit →
                          </Text>
                        </PressableScale>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </Card>

      {/* Modals */}
      <CreateVaultModal
        visible={createVaultVisible}
        onClose={() => setCreateVaultVisible(false)}
        accountId={accountId}
        maxAvailable={unallocatedBalance}
        currencyCode={currencyCode}
        onSuccess={() => {
          void fetchOverview();
          if (onRefreshParent) onRefreshParent();
        }}
      />

      {transferModal && (
        <DepositWithdrawModal
          visible={Boolean(transferModal)}
          onClose={() => setTransferModal(null)}
          accountId={accountId}
          mode={transferModal.mode}
          allocation={transferModal.allocation}
          maxAmount={
            transferModal.mode === 'deposit'
              ? unallocatedBalance
              : transferModal.allocation.balance
          }
          currencyCode={currencyCode}
          onSuccess={() => {
            void fetchOverview();
            if (onRefreshParent) onRefreshParent();
          }}
        />
      )}

      <CreateMonthlyPlanModal
        visible={createPlanVisible}
        onClose={() => setCreatePlanVisible(false)}
        accountId={accountId}
        maxAvailable={unallocatedBalance}
        currencyCode={currencyCode}
        onSuccess={() => {
          void fetchOverview();
          if (onRefreshParent) onRefreshParent();
        }}
      />

      {activeBudgetPlan && coverDeficitVisible && (
        <CoverDeficitModal
          visible={coverDeficitVisible}
          onClose={() => setCoverDeficitVisible(false)}
          accountId={accountId}
          plan={activeBudgetPlan}
          currencyCode={currencyCode}
          onSuccess={() => {
            void fetchOverview();
            if (onRefreshParent) onRefreshParent();
          }}
        />
      )}

      {activeBudgetPlan && sweepVisible && (
        <SweepPlanModal
          visible={sweepVisible}
          onClose={() => setSweepVisible(false)}
          accountId={accountId}
          plan={activeBudgetPlan}
          allocations={allocations}
          currencyCode={currencyCode}
          onSuccess={() => {
            void fetchOverview();
            if (onRefreshParent) onRefreshParent();
          }}
        />
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// SUB-MODALS
// ---------------------------------------------------------------------------

function CreateVaultModal({
  visible,
  onClose,
  accountId,
  maxAvailable,
  currencyCode,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  accountId: string;
  maxAvailable: number;
  currencyCode: string;
  onSuccess: () => void;
}) {
  const { colors, isDark } = useTheme();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AllocationCategory>(AllocationCategory.Emergency);
  const [initialBalance, setInitialBalance] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName('');
      setCategory(AllocationCategory.Emergency);
      setInitialBalance('');
      setTargetAmount('');
      setError(null);
    }
  }, [visible]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Vault name is required');
      haptics.error();
      return;
    }
    const bal = initialBalance.trim() ? parseFloat(initialBalance) : 0;
    if (isNaN(bal) || bal < 0) {
      setError('Initial deposit must be 0 or greater');
      haptics.error();
      return;
    }
    if (bal > maxAvailable) {
      setError(`Initial deposit cannot exceed available cash (${formatMoney(maxAvailable, currencyCode)})`);
      haptics.error();
      return;
    }
    const parsedTarget = targetAmount.trim() ? parseFloat(targetAmount) : null;
    if (parsedTarget !== null && (isNaN(parsedTarget) || parsedTarget <= 0)) {
      setError('Target amount must be a positive number');
      haptics.error();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await accountAllocationsApi.createAllocation(accountId, {
        name: name.trim(),
        category,
        initialBalance: bal,
        targetAmount: parsedTarget,
      });
      haptics.success();
      onClose();
      onSuccess();
    } catch (err: any) {
      haptics.error();
      setError(err?.message || 'Failed to create vault');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Create Purpose Vault"
      subtitle="Carve out an isolated reserve"
      maxHeightRatio={0.88}
      footer={
        <Button
          title={loading ? 'Creating...' : 'Create Vault'}
          onPress={handleCreate}
          isLoading={loading}
          disabled={loading}
        />
      }
    >
      <View style={styles.formContainer}>
        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        <Input
          label="Vault Name"
          placeholder="e.g. Emergency Fund, Tax Reserve"
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (error) setError(null);
          }}
        />

        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          CATEGORY
        </Text>
        <View style={styles.chipWrap}>
          {VAULT_CATEGORIES.map((cat) => {
            const selected = category === cat.value;
            return (
              <PressableScale
                key={cat.value}
                onPress={() => {
                  haptics.selection();
                  setCategory(cat.value);
                }}
                style={[
                  styles.selectorChip,
                  {
                    backgroundColor: selected
                      ? colors.accentSoft
                      : isDark
                      ? colors.surfaceSubtle
                      : colors.surfaceMuted,
                    borderColor: selected ? colors.accent : colors.borderSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.selectorChipText,
                    { color: selected ? colors.accent : colors.textSecondary },
                  ]}
                >
                  {cat.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        <Input
          label={`Initial Deposit (${currencyCode})`}
          placeholder="0.00"
          keyboardType="decimal-pad"
          currencyCode={currencyCode}
          value={initialBalance}
          onChangeText={(v) => {
            setInitialBalance(v);
            if (error) setError(null);
          }}
        />
        <Text style={[styles.helperText, { color: colors.textMuted }]}>
          Available free cash: {formatMoney(maxAvailable, currencyCode)}
        </Text>

        <Input
          label={`Target Goal (${currencyCode}, Optional)`}
          placeholder="e.g. 5000.00"
          keyboardType="decimal-pad"
          currencyCode={currencyCode}
          value={targetAmount}
          onChangeText={(v) => {
            setTargetAmount(v);
            if (error) setError(null);
          }}
          containerStyle={{ marginBottom: 0 }}
        />
      </View>
    </ModalSheet>
  );
}

function DepositWithdrawModal({
  visible,
  onClose,
  accountId,
  mode,
  allocation,
  maxAmount,
  currencyCode,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  accountId: string;
  mode: 'deposit' | 'withdraw';
  allocation: AccountAllocationDto;
  maxAmount: number;
  currencyCode: string;
  onSuccess: () => void;
}) {
  const { colors, isDark } = useTheme();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setAmount('');
      setError(null);
    }
  }, [visible, allocation.id, mode]);

  const isDeposit = mode === 'deposit';

  const handleTransfer = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid positive amount');
      haptics.error();
      return;
    }
    if (amt > maxAmount) {
      setError(`Amount cannot exceed ${formatMoney(maxAmount, currencyCode)}`);
      haptics.error();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (isDeposit) {
        await accountAllocationsApi.deposit(accountId, allocation.id, amt);
      } else {
        await accountAllocationsApi.withdraw(accountId, allocation.id, amt);
      }
      haptics.success();
      onClose();
      onSuccess();
    } catch (err: any) {
      haptics.error();
      setError(err?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={isDeposit ? `Deposit to ${allocation.name}` : `Withdraw from ${allocation.name}`}
      subtitle={isDeposit ? 'Move available cash into this vault' : 'Return vault funds to available balance'}
      maxHeightRatio={0.85}
      footer={
        <Button
          title={loading ? 'Processing...' : isDeposit ? 'Confirm Deposit' : 'Confirm Withdrawal'}
          onPress={handleTransfer}
          isLoading={loading}
          disabled={loading}
        />
      }
    >
      <View style={styles.formContainer}>
        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}
        <Input
          label={`Amount (${currencyCode})`}
          placeholder="0.00"
          keyboardType="decimal-pad"
          currencyCode={currencyCode}
          value={amount}
          onChangeText={(v) => {
            setAmount(v);
            if (error) setError(null);
          }}
        />
        <View style={styles.quickFillRow}>
          <Text style={[styles.helperText, { color: colors.textMuted }]}>
            Max available: {formatMoney(maxAmount, currencyCode)}
          </Text>
          {maxAmount > 0 && (
            <PressableScale
              onPress={() => {
                haptics.selection();
                setAmount(formatCleanNumber(maxAmount));
              }}
              style={[
                styles.quickChip,
                { backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted },
              ]}
            >
              <Text style={[styles.quickChipText, { color: colors.accent }]}>Use Max</Text>
            </PressableScale>
          )}
        </View>
      </View>
    </ModalSheet>
  );
}

interface MobileSliceState {
  id: string;
  name: string;
  percentage: string;
  amount: string;
}

function CreateMonthlyPlanModal({
  visible,
  onClose,
  accountId,
  maxAvailable,
  currencyCode,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  accountId: string;
  maxAvailable: number;
  currencyCode: string;
  onSuccess: () => void;
}) {
  const { colors, isDark } = useTheme();
  const [budget, setBudget] = useState(maxAvailable > 0 ? String(Math.floor(maxAvailable)) : '0');
  const [slices, setSlices] = useState<MobileSliceState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const initBudget = maxAvailable > 0 ? Math.floor(maxAvailable) : 0;
    setBudget(String(initBudget));
    setError(null);
    setSlices([
      { id: '1', name: 'Essentials', percentage: '50', amount: formatCleanNumber(initBudget * 0.5) },
      { id: '2', name: 'Lifestyle & Wants', percentage: '30', amount: formatCleanNumber(initBudget * 0.3) },
      { id: '3', name: 'Bills & Sinking', percentage: '20', amount: formatCleanNumber(initBudget * 0.2) },
    ]);
  }, [visible, maxAvailable]);

  const budgetNum = parseFloat(budget) || 0;
  const currencySymbol =
    CURRENCY_METADATA[currencyCode as SupportedCurrencyCode]?.symbol ?? currencyCode;

  const totalPct =
    Math.round(slices.reduce((sum, s) => sum + (parseFloat(s.percentage) || 0), 0) * 100) / 100;
  const totalAllocatedAmount =
    Math.round(slices.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) * 100) / 100;
  const remainingPct = Math.round((100 - totalPct) * 100) / 100;
  const remainingAmt = Math.round((budgetNum - totalAllocatedAmount) * 100) / 100;

  const handleBudgetChange = (newBudgetStr: string) => {
    setBudget(newBudgetStr);
    const newBudgetNum = parseFloat(newBudgetStr) || 0;
    if (newBudgetNum >= 0) {
      setSlices((prev) =>
        prev.map((s) => {
          const pct = parseFloat(s.percentage) || 0;
          return {
            ...s,
            amount: formatCleanNumber((pct / 100) * newBudgetNum),
          };
        })
      );
    }
  };

  const handleAmountChange = (id: string, val: string) => {
    const num = parseFloat(val);
    setSlices((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (val === '' || isNaN(num) || num < 0) {
          return { ...s, amount: val, percentage: '' };
        }
        const calcPct = budgetNum > 0 ? (num / budgetNum) * 100 : 0;
        return {
          ...s,
          amount: val,
          percentage: formatCleanNumber(calcPct),
        };
      })
    );
  };

  const handlePercentageChange = (id: string, val: string) => {
    const num = parseFloat(val);
    setSlices((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (val === '' || isNaN(num) || num < 0) {
          return { ...s, percentage: val, amount: '' };
        }
        const calcAmt = budgetNum > 0 ? (num / 100) * budgetNum : 0;
        return {
          ...s,
          percentage: val,
          amount: formatCleanNumber(calcAmt),
        };
      })
    );
  };

  const applyPreset = (preset: '50-30-20' | '70-20-10' | 'even') => {
    haptics.selection();
    if (preset === '50-30-20') {
      setSlices([
        { id: '1', name: 'Essentials', percentage: '50', amount: formatCleanNumber(budgetNum * 0.5) },
        { id: '2', name: 'Lifestyle & Wants', percentage: '30', amount: formatCleanNumber(budgetNum * 0.3) },
        { id: '3', name: 'Bills & Sinking', percentage: '20', amount: formatCleanNumber(budgetNum * 0.2) },
      ]);
    } else if (preset === '70-20-10') {
      setSlices([
        { id: '1', name: 'Living Expenses', percentage: '70', amount: formatCleanNumber(budgetNum * 0.7) },
        { id: '2', name: 'Savings & Investments', percentage: '20', amount: formatCleanNumber(budgetNum * 0.2) },
        { id: '3', name: 'Discretionary', percentage: '10', amount: formatCleanNumber(budgetNum * 0.1) },
      ]);
    } else {
      const n = Math.max(1, slices.length);
      const basePct = Math.floor((100 / n) * 100) / 100;
      const remainder = Math.round((100 - basePct * n) * 100) / 100;
      setSlices((prev) =>
        prev.map((s, idx) => {
          const pct = idx === 0 ? basePct + remainder : basePct;
          return {
            ...s,
            percentage: formatCleanNumber(pct),
            amount: formatCleanNumber((pct / 100) * budgetNum),
          };
        })
      );
    }
  };

  const handleFillRemainder = () => {
    if (remainingPct <= 0 || slices.length === 0) return;
    haptics.selection();
    setSlices((prev) => {
      const copy = [...prev];
      const lastIndex = copy.length - 1;
      const last = copy[lastIndex];
      if (!last) return prev;
      const currentPct = parseFloat(last.percentage) || 0;
      const newPct = Math.round((currentPct + remainingPct) * 100) / 100;
      copy[lastIndex] = {
        ...last,
        percentage: formatCleanNumber(newPct),
        amount: formatCleanNumber((newPct / 100) * budgetNum),
      };
      return copy;
    });
  };

  const handleAddSlice = () => {
    haptics.selection();
    setSlices((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: `Slice ${prev.length + 1}`,
        percentage: remainingPct > 0 ? formatCleanNumber(remainingPct) : '0',
        amount: remainingPct > 0 ? formatCleanNumber((remainingPct / 100) * budgetNum) : '0',
      },
    ]);
  };

  const handleRemoveSlice = (id: string) => {
    if (slices.length <= 1) return;
    haptics.selection();
    setSlices((prev) => prev.filter((s) => s.id !== id));
  };

  const handleCreate = async () => {
    if (isNaN(budgetNum) || budgetNum <= 0 || budgetNum > maxAvailable) {
      setError(`Budget must be between 1 and ${formatMoney(maxAvailable, currencyCode)}`);
      haptics.error();
      return;
    }
    if (Math.abs(totalPct - 100) > 0.05) {
      setError(`Slice percentages must equal 100% (currently ${totalPct}%)`);
      haptics.error();
      return;
    }

    const normalized = [...slices];
    const diff = Math.round((100 - totalPct) * 100) / 100;
    if (Math.abs(diff) > 0 && normalized.length > 0) {
      const lastIndex = normalized.length - 1;
      const lastSlice = normalized[lastIndex];
      if (lastSlice) {
        const lastPct = parseFloat(lastSlice.percentage) || 0;
        normalized[lastIndex] = {
          ...lastSlice,
          percentage: String(Math.round((lastPct + diff) * 100) / 100),
        };
      }
    }

    try {
      setLoading(true);
      setError(null);
      const now = new Date();
      await accountAllocationsApi.createMonthlyPlan(accountId, {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        totalBudgetAmount: budgetNum,
        slices: normalized.map((s) => ({
          name: s.name.trim() || 'Slice',
          allocationPercentage: parseFloat(s.percentage) || 0,
        })),
      });
      haptics.success();
      onClose();
      onSuccess();
    } catch (err: any) {
      haptics.error();
      setError(err?.message || 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Setup Monthly Budget Plan"
      subtitle="Edit amount or % — both stay synchronized"
      maxHeightRatio={0.92}
      footer={
        <Button
          title={loading ? 'Activating...' : 'Activate Monthly Plan'}
          onPress={handleCreate}
          isLoading={loading}
          disabled={loading || Math.abs(totalPct - 100) > 0.05 || budgetNum <= 0 || budgetNum > maxAvailable}
        />
      }
    >
      <View style={styles.formContainer}>
        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        <Input
          label={`Monthly Budget Allowance (${currencyCode})`}
          placeholder="0.00"
          keyboardType="decimal-pad"
          currencyCode={currencyCode}
          value={budget}
          onChangeText={handleBudgetChange}
        />
        <View style={styles.quickFillRow}>
          <Text style={[styles.helperText, { color: colors.textMuted }]}>
            Available: {formatMoney(maxAvailable, currencyCode)}
          </Text>
          {maxAvailable > 0 && (
            <View style={styles.quickChipsGroup}>
              <PressableScale
                onPress={() => handleBudgetChange(String(Math.floor(maxAvailable)))}
                style={[styles.quickChip, { backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted }]}
              >
                <Text style={[styles.quickChipText, { color: colors.accent }]}>Max (100%)</Text>
              </PressableScale>
              <PressableScale
                onPress={() => handleBudgetChange(String(Math.floor(maxAvailable * 0.5)))}
                style={[styles.quickChip, { backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted }]}
              >
                <Text style={[styles.quickChipText, { color: colors.accent }]}>50%</Text>
              </PressableScale>
            </View>
          )}
        </View>

        <View style={styles.presetSection}>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Quick Presets
          </Text>
          <View style={styles.presetRow}>
            <PressableScale
              onPress={() => applyPreset('50-30-20')}
              style={[styles.presetChip, { borderColor: colors.borderSubtle, backgroundColor: isDark ? colors.surfaceSubtle : colors.background }]}
            >
              <Text style={[styles.presetChipText, { color: colors.textPrimary }]}>50/30/20</Text>
            </PressableScale>
            <PressableScale
              onPress={() => applyPreset('70-20-10')}
              style={[styles.presetChip, { borderColor: colors.borderSubtle, backgroundColor: isDark ? colors.surfaceSubtle : colors.background }]}
            >
              <Text style={[styles.presetChipText, { color: colors.textPrimary }]}>70/20/10</Text>
            </PressableScale>
            <PressableScale
              onPress={() => applyPreset('even')}
              style={[styles.presetChip, { borderColor: colors.borderSubtle, backgroundColor: isDark ? colors.surfaceSubtle : colors.background }]}
            >
              <Text style={[styles.presetChipText, { color: colors.textPrimary }]}>Even Split</Text>
            </PressableScale>
          </View>
        </View>

        {totalPct > 0 && (
          <View style={[styles.modalBarTrack, { backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted }]}>
            {slices.map((slice, idx) => {
              const pct = Math.max(0, parseFloat(slice.percentage) || 0);
              const sliceColor = SLICE_PALETTE[idx % SLICE_PALETTE.length] ?? colors.accent;
              return (
                <View
                  key={slice.id}
                  style={{
                    height: '100%',
                    backgroundColor: sliceColor,
                    width: `${Math.min(100, (pct / Math.max(100, totalPct)) * 100)}%`,
                  }}
                />
              );
            })}
          </View>
        )}

        <Text style={[styles.inputGroupLabel, { color: colors.textPrimary }]}>
          Budget Slices
        </Text>

        {slices.map((slice, idx) => {
          const sliceColor = SLICE_PALETTE[idx % SLICE_PALETTE.length] ?? colors.accent;
          return (
            <View
              key={slice.id}
              style={[
                styles.sliceFormCard,
                {
                  backgroundColor: isDark ? colors.surfaceSubtle : colors.background,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <View style={styles.sliceFormHeader}>
                <View style={styles.sliceHeaderLeft}>
                  <View style={[styles.sliceFormNumber, { backgroundColor: sliceColor }]}>
                    <Text style={styles.sliceFormNumberText}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      placeholder="Slice Name"
                      value={slice.name}
                      onChangeText={(val) => {
                        setSlices((prev) =>
                          prev.map((s) => (s.id === slice.id ? { ...s, name: val } : s))
                        );
                      }}
                      containerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                </View>
                {slices.length > 1 && (
                  <PressableScale
                    onPress={() => handleRemoveSlice(slice.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.sliceDeleteBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                  </PressableScale>
                )}
              </View>

              <View style={styles.sliceDualRow}>
                <View style={{ flex: 1 }}>
                  <Input
                    label={`Amount (${currencySymbol})`}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={slice.amount}
                    onChangeText={(val) => handleAmountChange(slice.id, val)}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
                <View style={styles.dualArrowIcon}>
                  <Ionicons name="swap-horizontal" size={14} color={colors.textMuted} />
                </View>
                <View style={{ width: 108 }}>
                  <Input
                    label="Share (%)"
                    placeholder="0"
                    keyboardType="decimal-pad"
                    value={slice.percentage}
                    onChangeText={(val) => handlePercentageChange(slice.id, val)}
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              </View>
            </View>
          );
        })}

        <PressableScale
          onPress={handleAddSlice}
          style={[
            styles.addSliceButton,
            {
              borderColor: colors.borderSubtle,
              backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
            },
          ]}
        >
          <Ionicons name="add" size={16} color={colors.accent} />
          <Text style={[styles.addSliceText, { color: colors.accent }]}>Add Slice</Text>
        </PressableScale>

        <View
          style={[
            styles.allocSummaryCard,
            {
              backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
              borderColor:
                Math.abs(totalPct - 100) <= 0.05
                  ? colors.accent
                  : totalPct > 100
                  ? colors.danger
                  : colors.warning,
            },
          ]}
        >
          <View style={styles.allocSummaryRow}>
            <Text style={[styles.allocSummaryLabel, { color: colors.textSecondary }]}>
              Allocated:
            </Text>
            <Text style={[styles.allocSummaryVal, { color: colors.textPrimary }]}>
              {formatMoney(totalAllocatedAmount, currencyCode)} / {formatMoney(budgetNum, currencyCode)}
            </Text>
          </View>

          <View style={styles.allocSummaryRow}>
            <Text style={[styles.allocSummaryLabel, { color: colors.textSecondary }]}>
              Total Percent:
            </Text>
            <Text
              style={[
                styles.allocSummaryVal,
                {
                  color:
                    Math.abs(totalPct - 100) <= 0.05
                      ? colors.accent
                      : totalPct > 100
                      ? colors.danger
                      : colors.warning,
                },
              ]}
            >
              {totalPct}% / 100%
            </Text>
          </View>

          {remainingPct > 0 && (
            <View style={[styles.remainderRow, { borderTopColor: colors.borderSubtle }]}>
              <Text style={[styles.remainderText, { color: colors.warning }]}>
                {formatMoney(remainingAmt, currencyCode)} ({remainingPct}%) unallocated
              </Text>
              <PressableScale
                onPress={handleFillRemainder}
                style={[styles.fillRemainderChip, { backgroundColor: colors.warningSoft }]}
              >
                <Text style={[styles.fillRemainderText, { color: colors.warning }]}>
                  Fill Remainder
                </Text>
              </PressableScale>
            </View>
          )}
        </View>
      </View>
    </ModalSheet>
  );
}

function CoverDeficitModal({
  visible,
  onClose,
  accountId,
  plan,
  currencyCode,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  accountId: string;
  plan: MonthlyBudgetPlanDto;
  currencyCode: string;
  onSuccess: () => void;
}) {
  const { colors, isDark } = useTheme();
  const [fromSliceId, setFromSliceId] = useState('');
  const [toSliceId, setToSliceId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setAmount('');
    setError(null);
    const availableSources = plan.slices.filter((s) => s.remainingAmount > 0);
    const depletedTarget = plan.slices.find((s) => s.remainingAmount <= 0);
    const initialFrom = availableSources[0]?.id || plan.slices[0]?.id || '';
    const initialTo =
      (depletedTarget && depletedTarget.id !== initialFrom ? depletedTarget.id : null) ||
      plan.slices.find((s) => s.id !== initialFrom)?.id ||
      '';
    setFromSliceId(initialFrom);
    setToSliceId(initialTo);
  }, [visible, plan]);

  const sourceSlice = plan.slices.find((s) => s.id === fromSliceId);
  const maxAvailable = Math.max(0, sourceSlice?.remainingAmount ?? 0);

  const handleCover = async () => {
    const amt = parseFloat(amount);
    if (!fromSliceId || !toSliceId || fromSliceId === toSliceId) {
      setError('Please pick distinct source and destination slices');
      haptics.error();
      return;
    }
    if (isNaN(amt) || amt <= 0 || amt > maxAvailable) {
      setError(`Amount must be between 0.01 and ${formatMoney(maxAvailable, currencyCode)}`);
      haptics.error();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await accountAllocationsApi.coverDeficit(accountId, plan.id, {
        fromSliceId,
        toSliceId,
        amount: amt,
      });
      haptics.success();
      onClose();
      onSuccess();
    } catch (err: any) {
      haptics.error();
      setError(err?.message || 'Failed to rebalance budget');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Rebalance Budget"
      subtitle="Move funds between monthly budget slices"
      maxHeightRatio={0.88}
      footer={
        <Button
          title={loading ? 'Transferring...' : 'Transfer Budget'}
          onPress={handleCover}
          isLoading={loading}
          disabled={loading || !parseFloat(amount) || maxAvailable <= 0 || !toSliceId}
        />
      }
    >
      <View style={styles.formContainer}>
        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          FROM SLICE (SOURCE)
        </Text>
        <View style={styles.chipWrap}>
          {plan.slices.map((s) => {
            const disabled = s.remainingAmount <= 0;
            const selected = fromSliceId === s.id;
            return (
              <PressableScale
                key={s.id}
                disabled={disabled}
                onPress={() => {
                  haptics.selection();
                  setFromSliceId(s.id);
                  if (toSliceId === s.id) {
                    const alt = plan.slices.find((x) => x.id !== s.id);
                    setToSliceId(alt?.id || '');
                  }
                }}
                style={[
                  styles.selectorChip,
                  {
                    backgroundColor: selected
                      ? colors.accentSoft
                      : isDark
                      ? colors.surfaceSubtle
                      : colors.surfaceMuted,
                    borderColor: selected ? colors.accent : colors.borderSubtle,
                    opacity: disabled ? 0.45 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.selectorChipText,
                    { color: selected ? colors.accent : colors.textSecondary },
                  ]}
                >
                  {s.name} ({formatMoney(s.remainingAmount, currencyCode)})
                </Text>
              </PressableScale>
            );
          })}
        </View>

        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, marginTop: spacing.xs }]}>
          TO SLICE (DESTINATION)
        </Text>
        <View style={styles.chipWrap}>
          {plan.slices
            .filter((s) => s.id !== fromSliceId)
            .map((s) => {
              const selected = toSliceId === s.id;
              return (
                <PressableScale
                  key={s.id}
                  onPress={() => {
                    haptics.selection();
                    setToSliceId(s.id);
                  }}
                  style={[
                    styles.selectorChip,
                    {
                      backgroundColor: selected
                        ? colors.accentSoft
                        : isDark
                        ? colors.surfaceSubtle
                        : colors.surfaceMuted,
                      borderColor: selected ? colors.accent : colors.borderSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.selectorChipText,
                      { color: selected ? colors.accent : colors.textSecondary },
                    ]}
                  >
                    {s.name} ({formatMoney(s.remainingAmount, currencyCode)})
                  </Text>
                </PressableScale>
              );
            })}
        </View>

        <Input
          label={`Transfer Amount (${currencyCode})`}
          placeholder="0.00"
          keyboardType="decimal-pad"
          currencyCode={currencyCode}
          value={amount}
          onChangeText={(v) => {
            setAmount(v);
            if (error) setError(null);
          }}
        />
        <Text style={[styles.helperText, { color: colors.textMuted }]}>
          Max transferable from {sourceSlice?.name || 'slice'}: {formatMoney(maxAvailable, currencyCode)}
        </Text>
      </View>
    </ModalSheet>
  );
}

function SweepPlanModal({
  visible,
  onClose,
  accountId,
  plan,
  allocations,
  currencyCode,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  accountId: string;
  plan: MonthlyBudgetPlanDto;
  allocations: AccountAllocationDto[];
  currencyCode: string;
  onSuccess: () => void;
}) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleSweep = async (targetId?: string | null) => {
    try {
      setLoading(true);
      await accountAllocationsApi.sweepPlan(accountId, plan.id, targetId);
      haptics.success();
      onClose();
      onSuccess();
    } catch (err: any) {
      haptics.error();
      Alert.alert('Error', err?.message || 'Failed to sweep plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Sweep Unspent Allowance"
      subtitle="Move unspent budget into savings or available cash"
      maxHeightRatio={0.85}
      footer={
        <Button title="Cancel" variant="ghost" onPress={onClose} disabled={loading} />
      }
    >
      <View style={styles.formContainer}>
        <Text style={[styles.sweepDesc, { color: colors.textSecondary }]}>
          You have{' '}
          <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
            {formatMoney(plan.totalRemaining, currencyCode)}
          </Text>{' '}
          unspent. Choose where to sweep these funds:
        </Text>

        <Button
          title="Sweep to Available Cash"
          variant="secondary"
          onPress={() => handleSweep(null)}
          disabled={loading}
          style={{ marginBottom: spacing.xs }}
        />

        {allocations.map((a) => (
          <Button
            key={a.id}
            title={`Sweep to Vault: ${a.name}`}
            variant="secondary"
            onPress={() => handleSweep(a.id)}
            disabled={loading}
            style={{ marginBottom: spacing.xs }}
          />
        ))}
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  loadingCard: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: spacing.base,
    borderRadius: radius.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  accountLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  title: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '700',
  },
  totalPill: {
    alignItems: 'flex-end',
  },
  totalPillLabel: {
    ...typography.caption,
    fontSize: 10,
  },
  totalPillVal: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  metricBox: {
    flex: 1,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  barContainer: {
    marginTop: spacing.md,
  },
  barTrack: {
    height: 7,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  sectionCard: {
    padding: spacing.base,
    borderRadius: radius.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  sectionTitle: {
    ...typography.bodyLarge,
    fontSize: 15,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    minHeight: 32,
    borderRadius: radius.full,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  planBtnRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 32,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  smallActionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyBox: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.caption,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  vaultsList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  vaultItem: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  vaultTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vaultName: {
    ...typography.body,
    fontWeight: '600',
  },
  categoryBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  vaultRightCol: {
    alignItems: 'flex-end',
  },
  vaultBalance: {
    ...typography.bodyLarge,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  vaultTargetText: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  vaultActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 32,
    borderRadius: radius.full,
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  planContent: {
    gap: spacing.sm + 2,
  },
  planSummaryBox: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  planSummaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
  },
  cycleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  closePlanBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closePlanBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  planPeriodText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  planRemainingText: {
    ...typography.heading,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  planBudgetText: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  slicesList: {
    gap: spacing.sm,
  },
  sliceCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sliceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    marginRight: spacing.sm,
  },
  sliceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sliceName: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  sliceRemaining: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sliceProgressTrack: {
    height: 5,
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  sliceProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  sliceBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  sliceSubtext: {
    ...typography.caption,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  deficitLinkText: {
    fontSize: 11,
    fontWeight: '700',
  },
  formContainer: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  errorBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  helperText: {
    ...typography.caption,
    fontSize: 11,
    marginTop: -4,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  selectorChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  selectorChipText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
  },
  quickFillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -2,
  },
  quickChipsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  presetSection: {
    marginTop: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.label,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 6,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalBarTrack: {
    height: 6,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    marginVertical: 4,
  },
  inputGroupLabel: {
    ...typography.label,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  sliceFormCard: {
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  sliceFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliceHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sliceFormNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliceFormNumberText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  sliceDeleteBtn: {
    padding: 8,
    marginLeft: spacing.xs,
  },
  sliceDualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dualArrowIcon: {
    paddingTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSliceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addSliceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  allocSummaryCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    marginTop: spacing.xs,
  },
  allocSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allocSummaryLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  allocSummaryVal: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  remainderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  remainderText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fillRemainderChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  fillRemainderText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sweepDesc: {
    ...typography.body,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
});
