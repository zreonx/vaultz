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
import { formatMoney } from '@/utils/currency';
import { haptics } from '@/utils/haptics';
import {
  AccountAllocationDto,
  AccountAllocationsOverviewResponse,
  AllocationCategory,
  MonthlyBudgetPlanDto,
} from '@/types/api';

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
              <Text style={[styles.planPeriodText, { color: '#6366f1' }]}>
                Cycle {activeBudgetPlan.year}-{String(activeBudgetPlan.month).padStart(2, '0')}
              </Text>
              <Text style={[styles.planRemainingText, { color: colors.textPrimary }]}>
                {hideBalance ? '••••' : formatMoney(activeBudgetPlan.totalRemaining, currencyCode)} remaining
              </Text>
              <Text style={[styles.planBudgetText, { color: colors.textMuted }]}>
                of {formatMoney(activeBudgetPlan.totalBudgetAmount, currencyCode)} budget
              </Text>
            </View>

            {/* Slices */}
            <View style={styles.slicesList}>
              {activeBudgetPlan.slices.map((slice) => {
                const pctSpent = slice.allocatedAmount > 0
                  ? Math.min(100, Math.round((slice.spentAmount / slice.allocatedAmount) * 100))
                  : 0;

                return (
                  <View
                    key={slice.id}
                    style={[
                      styles.sliceCard,
                      { borderColor: colors.borderSubtle, backgroundColor: isDark ? colors.surfaceSubtle : colors.surface },
                    ]}
                  >
                    <View style={styles.sliceHeader}>
                      <View style={styles.sliceNameRow}>
                        <Text style={[styles.sliceName, { color: colors.textPrimary }]}>
                          {slice.name}
                        </Text>
                        <Badge label={`${slice.allocationPercentage}%`} variant="outline" />
                      </View>
                      <Text style={[styles.sliceRemaining, { color: colors.textPrimary }]}>
                        {hideBalance ? '••••' : formatMoney(slice.remainingAmount, currencyCode)}
                      </Text>
                    </View>

                    <View style={styles.sliceProgressTrack}>
                      <View
                        style={[
                          styles.sliceProgressFill,
                          {
                            backgroundColor: pctSpent > 90 ? '#ef4444' : '#6366f1',
                            width: `${pctSpent}%`,
                          },
                        ]}
                      />
                    </View>

                    <Text style={[styles.sliceSubtext, { color: colors.textMuted }]}>
                      Spent {formatMoney(slice.spentAmount, currencyCode)} of {formatMoney(slice.allocatedAmount, currencyCode)}
                    </Text>
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
  const [budget, setBudget] = useState(maxAvailable > 0 ? String(Math.floor(maxAvailable)) : '0');
  const [slices, setSlices] = useState([
    { name: 'Essentials', percentage: '50' },
    { name: 'Lifestyle & Wants', percentage: '30' },
    { name: 'Bills & Sinking', percentage: '20' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPct = slices.reduce((sum, s) => sum + (parseFloat(s.percentage) || 0), 0);

  const handleCreate = async () => {
    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum <= 0 || budgetNum > maxAvailable) {
      setError(`Budget must be between 1 and ${formatMoney(maxAvailable, currencyCode)}`);
      return;
    }
    if (Math.abs(totalPct - 100) > 0.01) {
      setError(`Slice percentages must equal exactly 100% (currently ${totalPct}%)`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const now = new Date();
      await accountAllocationsApi.createMonthlyPlan(accountId, {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        totalBudgetAmount: budgetNum,
        slices: slices.map((s) => ({
          name: s.name.trim(),
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
    <ModalSheet visible={visible} onClose={onClose} title="Setup Monthly Plan (Tier 2)" subtitle="Partition active allowance into percentages">
      <View style={styles.formContainer}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Input
          label={`Total Budget Allowance (${currencyCode})`}
          placeholder="0.00"
          keyboardType="numeric"
          value={budget}
          onChangeText={setBudget}
        />
        <Text style={{ fontSize: 11, color: '#64748b', marginTop: -4 }}>
          Available: {formatMoney(maxAvailable, currencyCode)}
        </Text>

        <Text style={styles.inputGroupLabel}>
          Distribution Percentages (Total: {totalPct}% / 100%)
        </Text>

        {slices.map((slice, idx) => (
          <View key={idx} style={styles.sliceInputRow}>
            <View style={{ flex: 2 }}>
              <Input
                label={`Slice ${idx + 1}`}
                value={slice.name}
                onChangeText={(val) => {
                  const updated = [...slices];
                  updated[idx].name = val;
                  setSlices(updated);
                }}
              />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Input
                label="Percentage (%)"
                keyboardType="numeric"
                value={slice.percentage}
                onChangeText={(val) => {
                  const updated = [...slices];
                  updated[idx].percentage = val;
                  setSlices(updated);
                }}
              />
            </View>
          </View>
        ))}

        <Button
          title={loading ? 'Activating...' : 'Activate Plan'}
          onPress={handleCreate}
          disabled={loading || Math.abs(totalPct - 100) > 0.01}
          style={{ marginTop: spacing.md }}
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
  sliceSubtext: {
    fontSize: 10,
    marginTop: 4,
  },
  formContainer: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
  },
  inputGroupLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.xs,
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
