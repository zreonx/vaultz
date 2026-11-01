import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspace } from '@/context/WorkspaceContext';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { CreateTransactionModal } from '@/screens/transactions/CreateTransactionModal';
import { CreateAccountModal } from '@/components/shared/CreateAccountModal';
import { CreateLendingModal } from '@/screens/lending/CreateLendingModal';
import { TutorialBanner } from '@/components/tutorial/TutorialBanner';
import { useTutorial } from '@/context/TutorialContext';
import { dashboardApi } from '@/api/dashboard';
import { transactionsApi } from '@/api/transactions';
import { DashboardSummaryDto, TransactionDto, TransactionType } from '@/types/api';
import { colors } from '@/theme/colors';
import { typography, radius, spacing } from '@/theme/tokens';
import { formatMoney } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { haptics } from '@/utils/haptics';

interface DashboardScreenProps {
  navigation: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { activeWorkspace, hideBalance, toggleHideBalance, refetchAll } = useWorkspace();
  const { currentStep } = useTutorial();
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TransactionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [txModalVisible, setTxModalVisible] = useState(false);
  const [txDefaultType, setTxDefaultType] = useState<'Expense' | 'Income' | 'Transfer'>('Expense');
  const [lendingModalVisible, setLendingModalVisible] = useState(false);
  const [createAccountModalVisible, setCreateAccountModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sumData, txData] = await Promise.all([
        dashboardApi.getSummary(activeWorkspace?.id),
        transactionsApi.list({
          accountId: activeWorkspace?.id,
          page: 1,
          pageSize: 5,
        }),
      ]);
      setSummary(sumData);
      setRecentTransactions(txData.items || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    haptics.light();
    await Promise.all([refetchAll(), loadData()]);
    setRefreshing(false);
  };

  const openTxModal = (type: 'Expense' | 'Income' | 'Transfer') => {
    haptics.light();
    setTxDefaultType(type);
    setTxModalVisible(true);
  };

  const openLendingModal = () => {
    haptics.light();
    setLendingModalVisible(true);
  };

  const currency = activeWorkspace?.currency || 'USD';
  const balance = activeWorkspace?.currentBalance ?? summary?.totalBalance ?? 0;

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
        {/* Interactive Guided Onboarding Banner */}
        <TutorialBanner
          onOpenCreateAccount={() => setCreateAccountModalVisible(true)}
          onOpenCreateTransaction={() => openTxModal('Expense')}
        />

        {/* Balance Card */}
        <Card style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>
              {activeWorkspace ? `${activeWorkspace.name.toUpperCase()} BALANCE` : 'TOTAL NET BALANCE'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                haptics.light();
                toggleHideBalance();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={hideBalance ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <Skeleton width={180} height={36} style={{ marginVertical: 8 }} />
          ) : (
            <Text style={styles.balanceValue}>
              {hideBalance ? '••••••••' : formatMoney(balance, currency)}
            </Text>
          )}

          {/* Monthly Inflow / Outflow Summary */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconBadge}>
                <Ionicons name="arrow-down-outline" size={14} color={colors.accent} />
              </View>
              <View>
                <Text style={styles.statLabel}>Income this month</Text>
                <Text style={styles.statIncome}>
                  {hideBalance
                    ? '••••'
                    : formatMoney(summary?.monthlyIncome ?? 0, currency)}
                </Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={[styles.statIconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Ionicons name="arrow-up-outline" size={14} color={colors.danger} />
              </View>
              <View>
                <Text style={styles.statLabel}>Spent this month</Text>
                <Text style={styles.statExpense}>
                  {hideBalance
                    ? '••••'
                    : formatMoney(summary?.monthlyExpenses ?? 0, currency)}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
        </View>

        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              currentStep === 'record_transaction' && styles.actionBtnHighlighted,
            ]}
            onPress={() => openTxModal('Expense')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Ionicons name="remove-circle-outline" size={22} color={colors.danger} />
            </View>
            <Text style={styles.actionText}>Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              currentStep === 'record_transaction' && styles.actionBtnHighlighted,
            ]}
            onPress={() => openTxModal('Income')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: colors.accentMuted }]}>
              <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
            </View>
            <Text style={styles.actionText}>Income</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openTxModal('Transfer')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
              <Ionicons name="swap-horizontal-outline" size={22} color="#60A5FA" />
            </View>
            <Text style={styles.actionText}>Transfer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={openLendingModal}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <Ionicons name="people-outline" size={22} color={colors.warning} />
            </View>
            <Text style={styles.actionText}>IOU / Loan</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionHeaderWithAction}>
          <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
          <TouchableOpacity
            onPress={() => {
              haptics.light();
              navigation.navigate('Transactions');
            }}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <Card>
            <Skeleton height={32} style={{ marginBottom: 12 }} />
            <Skeleton height={32} style={{ marginBottom: 12 }} />
            <Skeleton height={32} />
          </Card>
        ) : recentTransactions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={32} color={colors.textDisabled} />
            <Text style={styles.emptyTitle}>No transactions recorded</Text>
            <Text style={styles.emptySubtitle}>Use the quick actions above to log your first transaction.</Text>
          </Card>
        ) : (
          <Card style={{ padding: 0 }}>
            {recentTransactions.map((tx, idx) => {
              const isExpense = tx.type === TransactionType.Expense || tx.typeName === 'Expense';
              const isIncome = tx.type === TransactionType.Income || tx.typeName === 'Income';
              const isLast = idx === recentTransactions.length - 1;

              return (
                <View
                  key={tx.id}
                  style={[styles.txRow, !isLast && styles.txRowBorder]}
                >
                  <View style={styles.txIconContainer}>
                    <Ionicons
                      name={
                        isExpense
                          ? 'arrow-up-circle-outline'
                          : isIncome
                          ? 'arrow-down-circle-outline'
                          : 'swap-horizontal-outline'
                      }
                      size={20}
                      color={
                        isExpense
                          ? colors.danger
                          : isIncome
                          ? colors.accent
                          : '#60A5FA'
                      }
                    />
                  </View>

                  <View style={styles.txDetails}>
                    <Text style={styles.txCategory} numberOfLines={1}>
                      {tx.category}
                    </Text>
                    <Text style={styles.txMeta} numberOfLines={1}>
                      {formatDate(tx.transactionDate)}
                      {tx.description ? ` • ${tx.description}` : ''}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.txAmount,
                      isExpense && styles.txAmountExpense,
                      isIncome && styles.txAmountIncome,
                    ]}
                  >
                    {hideBalance
                      ? '••••'
                      : `${isExpense ? '-' : isIncome ? '+' : ''}${formatMoney(tx.amount, tx.currency)}`}
                  </Text>
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>

      {/* Transaction creation modal */}
      <CreateTransactionModal
        visible={txModalVisible}
        onClose={() => setTxModalVisible(false)}
        defaultType={txDefaultType}
        onSuccess={loadData}
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
        onSuccess={loadData}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  balanceCard: {
    marginBottom: spacing.xl,
    padding: spacing.xl,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  balanceLabel: {
    ...typography.label,
    letterSpacing: 1,
    color: colors.textMuted,
  },
  balanceValue: {
    ...typography.display,
    fontSize: 34,
    color: colors.textPrimary,
    fontWeight: '800',
    marginVertical: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statIconBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  statIncome: {
    ...typography.body,
    fontWeight: '700',
    color: colors.accent,
  },
  statExpense: {
    ...typography.body,
    fontWeight: '700',
    color: colors.danger,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.label,
    letterSpacing: 1,
    color: colors.textSecondary,
  },
  viewAllText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.accent,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnHighlighted: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1.5,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  actionText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  txRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txIconContainer: {
    marginRight: spacing.md,
  },
  txDetails: {
    flex: 1,
    marginRight: spacing.sm,
  },
  txCategory: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  txMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  txAmount: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  txAmountExpense: {
    color: colors.danger,
  },
  txAmountIncome: {
    color: colors.accent,
  },
});
