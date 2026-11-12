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

const MOBILE_PALETTE = ['#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e'];

function formatCleanNumber(num: number): string {
  if (isNaN(num) || num <= 0) return '';
  const rounded = Math.round(num * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

interface AccountAllocationsCardProps {
  accountId: string;
  accountName: string;
  currencyCode: string;
  onRefreshParent?: () => void;
}

export const AccountAllocationsCard: React.FC<AccountAllocationsCardProps> = ({
  accountId,
  accountName,
  currencyCode,
  onRefreshParent,
}) => {
  const { colors, isDark } = useTheme();
  const { hideBalance } = useWorkspace();

  const [overview, setOverview] = useState<AccountAllocationsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
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
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (loading) {
    return (
      <Card variant="surface" style={styles.card}>
        <ActivityIndicator color={colors.accent} />
      </Card>
    );
  }

  if (!overview) return null;

  const {
    accountBalance,
    totalAllocatedInVaults,
    activePlanRemaining,
    unallocatedBalance,
    allocations,
    activeBudgetPlan,
  } = overview;

  return (
    <View style={styles.container}>
      {/* 2-Tier Header Overview Card */}
      <Card variant="surface" style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <View style={styles.tagRow}>
              <Badge label="2-Tier System" variant="outline" />
              <Text style={[styles.accountLabel, { color: colors.textMuted }]}>
                {accountName}
              </Text>
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Funds Partition & Finance
            </Text>
          </View>
        </View>

        {/* 3 Metric Badges */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5', borderColor: 'rgba(16, 185, 129, 0.2)' }]}>
            <View style={styles.metricHeader}>
              <Ionicons name="shield-checkmark-outline" size={13} color="#10b981" />
              <Text style={[styles.metricLabel, { color: '#10b981' }]}>Tier 1: Vaults</Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {hideBalance ? '••••' : formatMoney(totalAllocatedInVaults, currencyCode)}
            </Text>
          </View>

          <View style={[styles.metricBox, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#eef2ff', borderColor: 'rgba(99, 102, 241, 0.2)' }]}>
            <View style={styles.metricHeader}>
              <Ionicons name="sparkles-outline" size={13} color="#6366f1" />
              <Text style={[styles.metricLabel, { color: '#6366f1' }]}>Tier 2: Plan</Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {hideBalance ? '••••' : formatMoney(activePlanRemaining, currencyCode)}
            </Text>
          </View>

          <View style={[styles.metricBox, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb', borderColor: 'rgba(245, 158, 11, 0.2)' }]}>
            <View style={styles.metricHeader}>
              <Ionicons name="wallet-outline" size={13} color="#f59e0b" />
              <Text style={[styles.metricLabel, { color: '#f59e0b' }]}>Available</Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {hideBalance ? '••••' : formatMoney(unallocatedBalance, currencyCode)}
            </Text>
          </View>
        </View>

        {/* Visual Partition Bar */}
        {accountBalance > 0 && (
          <View style={styles.barContainer}>
            <View style={[styles.barTrack, { backgroundColor: isDark ? colors.surfaceSubtle : '#e2e8f0' }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: '#10b981',
                    width: `${Math.min(100, (totalAllocatedInVaults / accountBalance) * 100)}%`,
                  },
                ]}
              />
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: '#6366f1',
                    width: `${Math.min(100, (activePlanRemaining / accountBalance) * 100)}%`,
                  },
                ]}
              />
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: '#f59e0b',
                    width: `${Math.min(100, (unallocatedBalance / accountBalance) * 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}
      </Card>

      {/* TIER 1: PURPOSE VAULTS */}
      <Card variant="surface" style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <Ionicons name="shield-outline" size={18} color="#10b981" />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Tier 1: Purpose Vaults
            </Text>
          </View>
          <PressableScale
            onPress={() => {
              haptics.light();
              setCreateVaultVisible(true);
            }}
            style={[styles.addBtn, { backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted }]}
          >
            <Ionicons name="add" size={15} color={colors.accent} />
            <Text style={[styles.addBtnText, { color: colors.accent }]}>Vault</Text>
          </PressableScale>
        </View>

        {allocations.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No purpose vaults created yet. Protect savings from daily expenses.
            </Text>
          </View>
        ) : (
          <View style={styles.vaultsList}>
            {allocations.map((alloc) => (
              <View
                key={alloc.id}
                style={[
                  styles.vaultItem,
                  { borderColor: colors.borderSubtle, backgroundColor: isDark ? colors.surfaceSubtle : colors.surface },
                ]}
              >
                <View style={styles.vaultTopRow}>
                  <View>
                    <Text style={[styles.vaultName, { color: colors.textPrimary }]}>
                      {alloc.name}
                    </Text>
                    <Badge label={alloc.categoryName} variant="outline" style={styles.categoryBadge} />
                  </View>
                  <Text style={[styles.vaultBalance, { color: colors.textPrimary }]}>
                    {hideBalance ? '••••' : formatMoney(alloc.balance, currencyCode)}
                  </Text>
                </View>

                <View style={styles.vaultActionsRow}>
                  <PressableScale
                    onPress={() => {
                      haptics.selection();
                      setTransferModal({ mode: 'deposit', allocation: alloc });
                    }}
                    style={[styles.actionChip, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5' }]}
                  >
                    <Ionicons name="arrow-down-outline" size={12} color="#10b981" />
                    <Text style={[styles.actionChipText, { color: '#10b981' }]}>Deposit</Text>
                  </PressableScale>

                  <PressableScale
                    onPress={() => {
                      haptics.selection();
                      setTransferModal({ mode: 'withdraw', allocation: alloc });
                    }}
                    style={[styles.actionChip, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb' }]}
                  >
                    <Ionicons name="arrow-up-outline" size={12} color="#f59e0b" />
                    <Text style={[styles.actionChipText, { color: '#f59e0b' }]}>Withdraw</Text>
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
                              await accountAllocationsApi.deleteAllocation(accountId, alloc.id);
                              fetchOverview();
                              if (onRefreshParent) onRefreshParent();
                            },
                          },
                        ]
                      );
                    }}
                    style={styles.deleteIconBtn}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                  </PressableScale>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* TIER 2: MONTHLY LOGICAL FINANCE PLAN */}
      <Card variant="surface" style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <Ionicons name="sparkles-outline" size={18} color="#6366f1" />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Tier 2: Monthly Finance Plan
            </Text>
          </View>

          {activeBudgetPlan ? (
            <View style={styles.planBtnRow}>
              <PressableScale
                onPress={() => {
                  haptics.light();
                  setCoverDeficitVisible(true);
                }}
                style={[styles.smallActionBtn, { borderColor: '#6366f1' }]}
              >
                <Ionicons name="swap-horizontal" size={13} color="#6366f1" />
                <Text style={[styles.smallActionText, { color: '#6366f1' }]}>Cover Deficit</Text>
              </PressableScale>

              <PressableScale
                onPress={() => {
                  haptics.light();
                  setSweepVisible(true);
                }}
                style={[styles.smallActionBtn, { backgroundColor: '#6366f1' }]}
              >
                <Ionicons name="refresh" size={13} color="#ffffff" />
                <Text style={[styles.smallActionText, { color: '#ffffff' }]}>Sweep</Text>
              </PressableScale>
            </View>
          ) : (
            <PressableScale
              onPress={() => {
                haptics.light();
                setCreatePlanVisible(true);
              }}
              style={[styles.addBtn, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#eef2ff' }]}
            >
              <Ionicons name="add" size={15} color="#6366f1" />
              <Text style={[styles.addBtnText, { color: '#6366f1' }]}>Setup</Text>
            </PressableScale>
          )}
        </View>

        {!activeBudgetPlan ? (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No active monthly plan. Allocate percentage fragments (50/30/20) for strict disciplined spending.
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
            <View style={[styles.planSummaryBox, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.08)' : '#f8faff', borderColor: 'rgba(99, 102, 241, 0.2)' }]}>
              <View style={styles.planSummaryTopRow}>
                <View style={styles.cycleBadge}>
                  <View style={[styles.pulseDot, { backgroundColor: '#6366f1' }]} />
                  <Text style={[styles.planPeriodText, { color: '#6366f1' }]}>
                    Cycle {activeBudgetPlan.year}-{String(activeBudgetPlan.month).padStart(2, '0')}
                  </Text>
                </View>
                <PressableScale
                  onPress={() => {
                    Alert.alert(
                      'Close Monthly Plan?',
                      'Unspent funds will safely return to available cash.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Close Plan',
                          style: 'destructive',
                          onPress: async () => {
                            await accountAllocationsApi.closePlan(accountId, activeBudgetPlan.id);
                            fetchOverview();
                            if (onRefreshParent) onRefreshParent();
                          },
                        },
                      ]
                    );
                  }}
                  style={styles.closePlanBtn}
                >
                  <Text style={[styles.closePlanBtnText, { color: colors.textMuted }]}>Close</Text>
                </PressableScale>
              </View>

              <Text style={[styles.planRemainingText, { color: colors.textPrimary }]}>
                {hideBalance ? '••••' : formatMoney(activeBudgetPlan.totalRemaining, currencyCode)} remaining
              </Text>
              <Text style={[styles.planBudgetText, { color: colors.textMuted }]}>
                Spent {formatMoney(activeBudgetPlan.totalSpent, currencyCode)} of {formatMoney(activeBudgetPlan.totalBudgetAmount, currencyCode)} ({activeBudgetPlan.totalBudgetAmount > 0 ? Math.round((activeBudgetPlan.totalSpent / activeBudgetPlan.totalBudgetAmount) * 100) : 0}%)
              </Text>

              {/* Progress bar */}
              <View style={[styles.sliceProgressTrack, { height: 6, borderRadius: 3, marginTop: 8 }]}>
                <View
                  style={[
                    styles.sliceProgressFill,
                    {
                      backgroundColor: '#6366f1',
                      width: `${activeBudgetPlan.totalBudgetAmount > 0 ? Math.min(100, Math.round((activeBudgetPlan.totalSpent / activeBudgetPlan.totalBudgetAmount) * 100)) : 0}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Slices */}
            <View style={styles.slicesList}>
              {activeBudgetPlan.slices.map((slice, idx) => {
                const pctSpent = slice.allocatedAmount > 0
                  ? Math.min(100, Math.round((slice.spentAmount / slice.allocatedAmount) * 100))
                  : 0;
                const isExhausted = slice.remainingAmount <= 0;
                const dotColor = MOBILE_PALETTE[idx % MOBILE_PALETTE.length] ?? '#6366f1';

                return (
                  <View
                    key={slice.id}
                    style={[
                      styles.sliceCard,
                      {
                        borderColor: isExhausted ? 'rgba(239, 68, 68, 0.4)' : colors.borderSubtle,
                        backgroundColor: isExhausted
                          ? (isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2')
                          : (isDark ? colors.surfaceSubtle : colors.surface),
                      },
                    ]}
                  >
                    <View style={styles.sliceHeader}>
                      <View style={styles.sliceNameRow}>
                        <View style={[styles.sliceDot, { backgroundColor: dotColor }]} />
                        <Text style={[styles.sliceName, { color: colors.textPrimary }]}>
                          {slice.name}
                        </Text>
                        <Badge label={`${slice.allocationPercentage}%`} variant="outline" />
                      </View>
                      <Text
                        style={[
                          styles.sliceRemaining,
                          { color: isExhausted ? '#ef4444' : colors.textPrimary },
                        ]}
                      >
                        {hideBalance ? '••••' : formatMoney(slice.remainingAmount, currencyCode)}
                      </Text>
                    </View>

                    <View style={styles.sliceProgressTrack}>
                      <View
                        style={[
                          styles.sliceProgressFill,
                          {
                            backgroundColor: isExhausted ? '#ef4444' : pctSpent > 80 ? '#f59e0b' : dotColor,
                            width: `${pctSpent}%`,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.sliceBottomRow}>
                      <Text style={[styles.sliceSubtext, { color: colors.textMuted }]}>
                        Spent {formatMoney(slice.spentAmount, currencyCode)} of {formatMoney(slice.allocatedAmount, currencyCode)}
                      </Text>
                      {isExhausted && (
                        <PressableScale
                          onPress={() => {
                            haptics.light();
                            setCoverDeficitVisible(true);
                          }}
                        >
                          <Text style={styles.deficitLinkText}>Cover Deficit &rarr;</Text>
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

      {/* CREATE VAULT MODAL */}
      <CreateVaultModal
        visible={createVaultVisible}
        onClose={() => setCreateVaultVisible(false)}
        accountId={accountId}
        maxAvailable={unallocatedBalance}
        currencyCode={currencyCode}
        onSuccess={() => {
          fetchOverview();
          if (onRefreshParent) onRefreshParent();
        }}
      />

      {/* DEPOSIT / WITHDRAW MODAL */}
      {transferModal && (
        <DepositWithdrawModal
          visible={Boolean(transferModal)}
          onClose={() => setTransferModal(null)}
          accountId={accountId}
          mode={transferModal.mode}
          allocation={transferModal.allocation}
          maxAmount={transferModal.mode === 'deposit' ? unallocatedBalance : transferModal.allocation.balance}
          currencyCode={currencyCode}
          onSuccess={() => {
            fetchOverview();
            if (onRefreshParent) onRefreshParent();
          }}
        />
      )}

      {/* CREATE MONTHLY PLAN MODAL */}
      <CreateMonthlyPlanModal
        visible={createPlanVisible}
        onClose={() => setCreatePlanVisible(false)}
        accountId={accountId}
        maxAvailable={unallocatedBalance}
        currencyCode={currencyCode}
        onSuccess={() => {
          fetchOverview();
          if (onRefreshParent) onRefreshParent();
        }}
      />

      {/* COVER DEFICIT MODAL */}
      {activeBudgetPlan && coverDeficitVisible && (
        <CoverDeficitModal
          visible={coverDeficitVisible}
          onClose={() => setCoverDeficitVisible(false)}
          accountId={accountId}
          plan={activeBudgetPlan}
          currencyCode={currencyCode}
          onSuccess={() => {
            fetchOverview();
            if (onRefreshParent) onRefreshParent();
          }}
        />
      )}

      {/* SWEEP PLAN MODAL */}
      {activeBudgetPlan && sweepVisible && (
        <SweepPlanModal
          visible={sweepVisible}
          onClose={() => setSweepVisible(false)}
          accountId={accountId}
          plan={activeBudgetPlan}
          allocations={allocations}
          currencyCode={currencyCode}
          onSuccess={() => {
            fetchOverview();
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
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Vault name is required');
      return;
    }
    const bal = parseFloat(initialBalance) || 0;
    if (bal > maxAvailable) {
      setError(`Initial deposit cannot exceed available balance (${formatMoney(maxAvailable, currencyCode)})`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await accountAllocationsApi.createAllocation(accountId, {
        name: name.trim(),
        category: AllocationCategory.Emergency,
        initialBalance: bal,
      });
      haptics.success();
      setName('');
      setInitialBalance('0');
      onClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create vault');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title="Create Purpose Vault (Tier 1)" subtitle="Carve out an isolated reserve">
      <View style={styles.formContainer}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Input label="Vault Name" placeholder="e.g. Emergency Fund" value={name} onChangeText={setName} />
        <Input
          label={`Initial Deposit (${currencyCode})`}
          placeholder="0.00"
          keyboardType="numeric"
          value={initialBalance}
          onChangeText={setInitialBalance}
        />
        <Text style={{ fontSize: 11, color: '#64748b', marginTop: -4 }}>
          Available free cash: {formatMoney(maxAvailable, currencyCode)}
        </Text>
        <Button title={loading ? 'Creating...' : 'Create Vault'} onPress={handleCreate} disabled={loading} style={{ marginTop: spacing.md }} />
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
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDeposit = mode === 'deposit';

  const handleTransfer = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (amt > maxAmount) {
      setError(`Amount cannot exceed ${formatMoney(maxAmount, currencyCode)}`);
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
      setError(err.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={isDeposit ? `Deposit to ${allocation.name}` : `Withdraw from ${allocation.name}`}
      subtitle={isDeposit ? 'Move funds from available cash into vault' : 'Return funds to available account balance'}
    >
      <View style={styles.formContainer}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Input
          label={`Amount (${currencyCode})`}
          placeholder="0.00"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <Text style={{ fontSize: 11, color: '#64748b', marginTop: -4 }}>
          Max: {formatMoney(maxAmount, currencyCode)}
        </Text>
        <Button
          title={loading ? 'Processing...' : isDeposit ? 'Confirm Deposit' : 'Confirm Withdrawal'}
          onPress={handleTransfer}
          disabled={loading}
          style={{ marginTop: spacing.md }}
        />
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
  const budgetNum = parseFloat(budget) || 0;
  const currencySymbol =
    CURRENCY_METADATA[currencyCode as SupportedCurrencyCode]?.symbol ?? currencyCode;

  const [slices, setSlices] = useState<MobileSliceState[]>(() => {
    const initBudget = maxAvailable > 0 ? Math.floor(maxAvailable) : 0;
    return [
      { id: '1', name: 'Essentials', percentage: '50', amount: formatCleanNumber(initBudget * 0.5) },
      { id: '2', name: 'Lifestyle & Wants', percentage: '30', amount: formatCleanNumber(initBudget * 0.3) },
      { id: '3', name: 'Bills & Sinking', percentage: '20', amount: formatCleanNumber(initBudget * 0.2) },
    ];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPct = Math.round(
    slices.reduce((sum, s) => sum + (parseFloat(s.percentage) || 0), 0) * 100
  ) / 100;

  const totalAllocatedAmount = Math.round(
    slices.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) * 100
  ) / 100;

  const remainingPct = Math.round((100 - totalPct) * 100) / 100;
  const remainingAmt = Math.round((budgetNum - totalAllocatedAmount) * 100) / 100;

  const handleBudgetChange = (newBudgetStr: string) => {
    setBudget(newBudgetStr);
    const newBudgetNum = parseFloat(newBudgetStr) || 0;
    if (newBudgetNum > 0) {
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
    } else if (preset === 'even') {
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
      return;
    }
    if (Math.abs(totalPct - 100) > 0.05) {
      setError(`Slice percentages must equal 100% (currently ${totalPct}%)`);
      return;
    }

    // Auto-normalize slight float difference within 0.05%
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
      setError(err.message || 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Setup Monthly Plan (Tier 2)"
      subtitle="Edit amount or % — both stay synchronized in real time"
    >
      <View style={styles.formContainer}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Total Budget Input */}
        <Input
          label={`Monthly Budget Allowance (${currencyCode})`}
          placeholder="0.00"
          keyboardType="numeric"
          currencyCode={currencyCode}
          value={budget}
          onChangeText={handleBudgetChange}
        />
        <View style={styles.quickFillRow}>
          <Text style={[styles.availableSubtext, { color: colors.textMuted }]}>
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

        {/* Presets Row */}
        <View style={styles.presetSection}>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Quick Presets
          </Text>
          <View style={styles.presetRow}>
            <PressableScale
              onPress={() => applyPreset('50-30-20')}
              style={[styles.presetChip, { borderColor: colors.borderSubtle }]}
            >
              <Text style={[styles.presetChipText, { color: colors.textPrimary }]}>50/30/20</Text>
            </PressableScale>
            <PressableScale
              onPress={() => applyPreset('70-20-10')}
              style={[styles.presetChip, { borderColor: colors.borderSubtle }]}
            >
              <Text style={[styles.presetChipText, { color: colors.textPrimary }]}>70/20/10</Text>
            </PressableScale>
            <PressableScale
              onPress={() => applyPreset('even')}
              style={[styles.presetChip, { borderColor: colors.borderSubtle }]}
            >
              <Text style={[styles.presetChipText, { color: colors.textPrimary }]}>Even Split</Text>
            </PressableScale>
          </View>
        </View>

        {/* Visualizer Segment Bar */}
        {totalPct > 0 && (
          <View style={[styles.modalBarTrack, { backgroundColor: isDark ? colors.surfaceSubtle : '#e2e8f0' }]}>
            {slices.map((slice, idx) => {
              const pct = Math.max(0, parseFloat(slice.percentage) || 0);
              const color = MOBILE_PALETTE[idx % MOBILE_PALETTE.length] ?? '#6366f1';
              return (
                <View
                  key={slice.id}
                  style={{
                    height: '100%',
                    backgroundColor: color,
                    width: `${Math.min(100, (pct / Math.max(100, totalPct)) * 100)}%`,
                  }}
                />
              );
            })}
          </View>
        )}

        {/* Slices Form List */}
        <Text style={[styles.inputGroupLabel, { color: colors.textPrimary }]}>
          Budget Slices (Edit Price or %)
        </Text>

        {slices.map((slice, idx) => {
          const color = MOBILE_PALETTE[idx % MOBILE_PALETTE.length] ?? '#6366f1';
          return (
            <View
              key={slice.id}
              style={[
                styles.sliceFormCard,
                {
                  backgroundColor: isDark ? colors.surfaceSubtle : colors.surface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <View style={styles.sliceFormHeader}>
                <View style={styles.sliceHeaderLeft}>
                  <View style={[styles.sliceFormNumber, { backgroundColor: color }]}>
                    <Text style={styles.sliceFormNumberText}>{idx + 1}</Text>
                  </View>
                  <Input
                    placeholder="Slice Name"
                    value={slice.name}
                    onChangeText={(val) => {
                      setSlices((prev) =>
                        prev.map((s) => (s.id === slice.id ? { ...s, name: val } : s))
                      );
                    }}
                    style={{ flex: 1, height: 38 }}
                  />
                </View>
                {slices.length > 1 && (
                  <PressableScale
                    onPress={() => handleRemoveSlice(slice.id)}
                    style={styles.sliceDeleteBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                  </PressableScale>
                )}
              </View>

              {/* Dual Inputs: Price and % */}
              <View style={styles.sliceDualRow}>
                <View style={{ flex: 1 }}>
                  <Input
                    label={`Amount (${currencySymbol})`}
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={slice.amount}
                    onChangeText={(val) => handleAmountChange(slice.id, val)}
                  />
                </View>
                <View style={styles.dualArrowIcon}>
                  <Ionicons name="swap-horizontal" size={14} color={colors.textMuted} />
                </View>
                <View style={{ width: 100 }}>
                  <Input
                    label="Share (%)"
                    placeholder="0"
                    keyboardType="numeric"
                    value={slice.percentage}
                    onChangeText={(val) => handlePercentageChange(slice.id, val)}
                  />
                </View>
              </View>
            </View>
          );
        })}

        {/* Add Slice Button */}
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

        {/* Allocation Summary Box */}
        <View
          style={[
            styles.allocSummaryCard,
            {
              backgroundColor: isDark ? 'rgba(99, 102, 241, 0.08)' : '#f8faff',
              borderColor:
                Math.abs(totalPct - 100) <= 0.05
                  ? 'rgba(16, 185, 129, 0.3)'
                  : totalPct > 100
                  ? 'rgba(239, 68, 68, 0.3)'
                  : 'rgba(245, 158, 11, 0.3)',
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
                      ? '#10b981'
                      : totalPct > 100
                      ? '#ef4444'
                      : '#f59e0b',
                },
              ]}
            >
              {totalPct}% / 100%
            </Text>
          </View>

          {remainingPct > 0 && (
            <View style={styles.remainderRow}>
              <Text style={[styles.remainderText, { color: '#f59e0b' }]}>
                {formatMoney(remainingAmt, currencyCode)} ({remainingPct}%) unallocated
              </Text>
              <PressableScale
                onPress={handleFillRemainder}
                style={[styles.fillRemainderChip, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fffbeb' }]}
              >
                <Text style={styles.fillRemainderText}>Fill Remainder</Text>
              </PressableScale>
            </View>
          )}
        </View>

        <Button
          title={loading ? 'Activating...' : 'Activate Monthly Plan'}
          onPress={handleCreate}
          disabled={loading || Math.abs(totalPct - 100) > 0.05 || budgetNum <= 0 || budgetNum > maxAvailable}
          style={{ marginTop: spacing.sm }}
        />
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
  const [fromSliceId, setFromSliceId] = useState(plan.slices[0]?.id || '');
  const [toSliceId, setToSliceId] = useState(plan.slices[1]?.id || '');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceSlice = plan.slices.find((s) => s.id === fromSliceId);
  const maxAvailable = sourceSlice?.remainingAmount ?? 0;

  const handleCover = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0 || amt > maxAvailable) {
      setError(`Amount must be between 0.01 and ${formatMoney(maxAvailable, currencyCode)}`);
      return;
    }
    if (fromSliceId === toSliceId) {
      setError('Source and target slices must be different');
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
      setError(err.message || 'Failed to cover deficit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title="Cover Slice Deficit" subtitle="Strict Rule: Transfer between slices to unlock transactions">
      <View style={styles.formContainer}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Text style={styles.inputGroupLabel}>
          Lending from: {sourceSlice?.name} ({formatMoney(maxAvailable, currencyCode)} remaining)
        </Text>
        <Input
          label={`Transfer Amount (${currencyCode})`}
          placeholder="0.00"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <Text style={{ fontSize: 11, color: '#64748b', marginTop: -4 }}>
          Max: {formatMoney(maxAvailable, currencyCode)}
        </Text>
        <Button
          title={loading ? 'Transferring...' : 'Transfer Budget'}
          onPress={handleCover}
          disabled={loading || !parseFloat(amount)}
          style={{ marginTop: spacing.md }}
        />
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
  const [loading, setLoading] = useState(false);

  const handleSweep = async (targetId?: string | null) => {
    try {
      setLoading(true);
      await accountAllocationsApi.sweepPlan(accountId, plan.id, targetId);
      haptics.success();
      onClose();
      onSuccess();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to sweep plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title="Sweep Unspent Allowance" subtitle="Safely save unspent budget into a vault">
      <View style={styles.formContainer}>
        <Text style={styles.sweepDesc}>
          You have <Text style={{ fontWeight: 'bold' }}>{formatMoney(plan.totalRemaining, currencyCode)}</Text> unspent. Choose where to sweep:
        </Text>

        <Button
          title="Sweep to Available Cash (General Balance)"
          variant="secondary"
          onPress={() => handleSweep(null)}
          disabled={loading}
          style={{ marginBottom: spacing.sm }}
        />

        {allocations.map((a) => (
          <Button
            key={a.id}
            title={`Sweep to Vault: ${a.name}`}
            variant="secondary"
            onPress={() => handleSweep(a.id)}
            disabled={loading}
            style={{ marginBottom: spacing.sm }}
          />
        ))}
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  accountLabel: {
    fontSize: typography.caption.fontSize,
  },
  title: {
    fontSize: typography.heading.fontSize,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metricBox: {
    flex: 1,
    padding: spacing.sm,
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
    fontSize: typography.body.fontSize,
    fontWeight: '700',
    marginTop: 4,
  },
  barContainer: {
    marginTop: spacing.md,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  sectionCard: {
    padding: spacing.md,
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
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.sm,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
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
    fontSize: typography.caption.fontSize,
    textAlign: 'center',
  },
  vaultsList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  vaultItem: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  vaultTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vaultName: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  categoryBadge: {
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  vaultBalance: {
    fontSize: typography.body.fontSize,
    fontWeight: '700',
  },
  vaultActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deleteIconBtn: {
    padding: 4,
    marginLeft: 'auto',
  },
  planContent: {
    gap: spacing.sm,
  },
  planSummaryBox: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  closePlanBtnText: {
    fontSize: 11,
    fontWeight: '500',
  },
  planPeriodText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  planRemainingText: {
    fontSize: typography.heading.fontSize,
    fontWeight: '800',
    marginTop: 2,
  },
  planBudgetText: {
    fontSize: 11,
  },
  slicesList: {
    gap: spacing.xs,
  },
  sliceCard: {
    padding: spacing.sm,
    borderRadius: radius.md,
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
  },
  sliceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sliceName: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  sliceRemaining: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
  },
  sliceProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    marginTop: 6,
    overflow: 'hidden',
  },
  sliceProgressFill: {
    height: '100%',
  },
  sliceBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sliceSubtext: {
    fontSize: 10,
  },
  deficitLinkText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ef4444',
  },
  formContainer: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
  },
  availableSubtext: {
    fontSize: 11,
  },
  quickFillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -4,
  },
  quickChipsGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  quickChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  quickChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  presetSection: {
    marginTop: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipText: {
    fontSize: 11,
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
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  sliceFormCard: {
    padding: spacing.sm,
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
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  sliceDeleteBtn: {
    padding: 6,
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
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addSliceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  allocSummaryCard: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
    marginTop: spacing.xs,
  },
  allocSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allocSummaryLabel: {
    fontSize: 11,
  },
  allocSummaryVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  remainderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(245, 158, 11, 0.3)',
  },
  remainderText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fillRemainderChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  fillRemainderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f59e0b',
  },
  sliceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sweepDesc: {
    fontSize: typography.body.fontSize,
    marginBottom: spacing.md,
  },
});
