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
import { useOfflineSync } from '@/context/OfflineSyncContext';
import { useTheme } from '@/context/ThemeContext';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { PressableScale } from '@/components/ui/PressableScale';
import { FadeInView } from '@/components/ui/FadeInView';
import { CreateTransactionModal } from '@/screens/transactions/CreateTransactionModal';
import { CreateAccountModal } from '@/components/shared/CreateAccountModal';
import { CreateLendingModal } from '@/screens/lending/CreateLendingModal';
import { SpotlightTourModal } from '@/components/tutorial/SpotlightTourModal';
import { useTutorial } from '@/context/TutorialContext';
import { dashboardApi } from '@/api/dashboard';
import { transactionsApi } from '@/api/transactions';
import { DashboardSummaryDto, TransactionDto, TransactionType } from '@/types/api';
import { typography, radius, spacing } from '@/theme/tokens';
import { formatMoney } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { haptics } from '@/utils/haptics';

interface DashboardScreenProps {
  navigation: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { activeWorkspace, hideBalance, toggleHideBalance, refetchAll } = useWorkspace();
  const { pendingQueue, pendingCount, isSyncing, syncQueue } = useOfflineSync();
  const { registerTargetRect, isTourActive, currentStepIndex, nextStep } = useTutorial();
  const { colors, isDark } = useTheme();
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TransactionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const balanceCardRef = React.useRef<any>(null);
  const quickActionsRef = React.useRef<any>(null);

  const handleBalanceCardLayout = () => {
    balanceCardRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      if (width > 0 && height > 0) {
        registerTargetRect('balance_card', { x, y, width, height });
      }
    });
  };

  const handleQuickActionsLayout = () => {
    quickActionsRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      if (width > 0 && height > 0) {
        registerTargetRect('quick_actions', { x, y, width, height });
      }
    });
  };

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
      // Offline fallback: keep existing or empty
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
    await Promise.all([syncQueue(), refetchAll(), loadData()]);
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

  // Optimistic pending balance calculation
  const pendingDelta = React.useMemo(() => {
    if (!activeWorkspace?.id) return 0;
    return pendingQueue
      .filter((q) => q.accountId === activeWorkspace.id && q.syncStatus !== 'failed')
      .reduce((acc, q) => {
        if (q.type === 'Income') return acc + q.amount;
        if (q.type === 'Expense' || q.type === 'Transfer') return acc - q.amount;
        return acc;
      }, 0);
  }, [pendingQueue, activeWorkspace?.id]);

  // Offline pending items for the recent list
  const offlineRecent: TransactionDto[] = React.useMemo(() => {
    return pendingQueue
      .filter((q) => !activeWorkspace?.id || q.accountId === activeWorkspace.id)
      .map((q) => ({
        id: q.id,
        accountId: q.accountId,
        accountName: q.accountName,
        type:
          q.type === 'Income'
            ? TransactionType.Income
            : q.type === 'Transfer'
            ? TransactionType.Transfer
            : TransactionType.Expense,
        typeName: q.type,
        amount: q.amount,
        currency: q.currency,
        currencyCode: q.currency,
        category: q.category,
        categoryName: q.category,
        description: q.description || q.category,
        occurredOn: q.transactionDate.split('T')[0],
        transactionDate: q.transactionDate,
        createdAtUtc: q.createdAt,
        isPendingSync: true,
        syncStatus: q.syncStatus,
      }));
  }, [pendingQueue, activeWorkspace?.id]);

  const displayedRecentTransactions = React.useMemo(() => {
    return [...offlineRecent, ...recentTransactions].slice(0, 5);
  }, [offlineRecent, recentTransactions]);

  const currency = activeWorkspace?.currency || 'USD';
  const rawBalance = activeWorkspace?.currentBalance ?? summary?.totalBalance ?? 0;
  const balance = rawBalance + pendingDelta;

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
        {/* Balance Card with Fade-Slide Entry */}
        <FadeInView delay={50} translateY={12}>
          <View ref={balanceCardRef} onLayout={handleBalanceCardLayout}>
            <Card style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>
                  {activeWorkspace
                    ? `${activeWorkspace.name.toUpperCase()} BALANCE`
                    : 'TOTAL NET BALANCE'}
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
                <Skeleton width={180} height={36} style={{ marginVertical: 8, borderRadius: radius.md }} />
              ) : (
                <Text style={[styles.balanceValue, { color: colors.textPrimary }]}>
                  {hideBalance ? '••••••••' : formatMoney(balance, currency)}
                </Text>
              )}

              {/* Monthly Inflow / Outflow Summary */}
              <View style={[styles.statsRow, { borderTopColor: colors.borderSubtle }]}>
                <View style={styles.statItem}>
                  <View style={[styles.statIconBadge, { backgroundColor: colors.accentSoft }]}>
                    <Ionicons name="arrow-down-outline" size={13} color={colors.accent} />
                  </View>
                  <View>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                      Income this month
                    </Text>
                    <Text style={[styles.statIncome, { color: colors.accent }]}>
                      {hideBalance ? '••••' : formatMoney(summary?.monthlyIncome ?? 0, currency)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />

                <View style={styles.statItem}>
                  <View style={[styles.statIconBadge, { backgroundColor: colors.dangerSoft }]}>
                    <Ionicons name="arrow-up-outline" size={13} color={colors.danger} />
                  </View>
                  <View>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                      Spent this month
                    </Text>
                    <Text style={[styles.statExpense, { color: colors.danger }]}>
                      {hideBalance ? '••••' : formatMoney(summary?.monthlyExpenses ?? 0, currency)}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          </View>
        </FadeInView>

        {/* Quick Actions — Clean, modern borderless tap targets */}
        <FadeInView delay={120} translateY={12}>
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
              onPress={() => openTxModal('Expense')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: colors.dangerSoft }]}>
                <Ionicons name="arrow-up-outline" size={20} color={colors.danger} />
              </View>
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>Expense</Text>
            </PressableScale>

            <PressableScale
              style={styles.actionBtn}
              onPress={() => openTxModal('Income')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="arrow-down-outline" size={20} color={colors.accent} />
              </View>
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>Income</Text>
            </PressableScale>

            <PressableScale
              style={styles.actionBtn}
              onPress={() => openTxModal('Transfer')}
            >
              <View
                style={[
                  styles.actionIconContainer,
                  {
                    backgroundColor: isDark ? '#192538' : '#EFF6FF',
                  },
                ]}
              >
                <Ionicons
                  name="swap-horizontal-outline"
                  size={20}
                  color={isDark ? '#60A5FA' : '#2563EB'}
                />
              </View>
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>Transfer</Text>
            </PressableScale>

            <PressableScale
              style={styles.actionBtn}
              onPress={openLendingModal}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: colors.warningSoft }]}>
                <Ionicons name="people-outline" size={20} color={colors.warning} />
              </View>
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>IOU / Loan</Text>
            </PressableScale>
          </View>
        </FadeInView>

        {/* Offline Pending Sync Banner */}
        {pendingCount > 0 && (
          <FadeInView delay={150} translateY={12}>
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
                <Ionicons name="cloud-upload-outline" size={18} color={colors.warning} />
                <View style={styles.syncBannerTexts}>
                  <Text style={[styles.syncBannerTitle, { color: colors.textPrimary }]}>
                    {pendingCount} {pendingCount === 1 ? 'transaction' : 'transactions'} saved offline
                  </Text>
                  <Text style={[styles.syncBannerSubtitle, { color: colors.textMuted }]}>
                    Will sync automatically once connected
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.syncBannerBtn,
                  { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                ]}
                onPress={() => syncQueue()}
                disabled={isSyncing}
              >
                <Text style={[styles.syncBannerBtnText, { color: colors.accent }]}>
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Text>
              </TouchableOpacity>
            </View>
          </FadeInView>
        )}

        {/* Recent Activity with Fade-In Animation */}
        <FadeInView delay={180} translateY={12}>
          <View style={styles.sectionHeaderWithAction}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              RECENT ACTIVITY
            </Text>
            <TouchableOpacity
              onPress={() => {
                haptics.light();
                navigation.navigate('Transactions');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.viewAllText, { color: colors.accent }]}>View All</Text>
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
              <Skeleton height={28} style={{ marginBottom: 10, borderRadius: radius.sm }} />
              <Skeleton height={28} style={{ marginBottom: 10, borderRadius: radius.sm }} />
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
              <Ionicons name="receipt-outline" size={34} color={colors.textMuted} />
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
                overflow: 'hidden',
              }}
            >
              {displayedRecentTransactions.map((tx, idx) => {
                const isExpense = tx.type === TransactionType.Expense || tx.typeName === 'Expense';
                const isIncome = tx.type === TransactionType.Income || tx.typeName === 'Income';
                const isLast = idx === displayedRecentTransactions.length - 1;

                const iconBg = isExpense
                  ? colors.dangerSoft
                  : isIncome
                  ? colors.accentSoft
                  : isDark
                  ? 'rgba(59, 130, 246, 0.14)'
                  : 'rgba(37, 99, 235, 0.08)';

                const iconColor = isExpense
                  ? colors.danger
                  : isIncome
                  ? colors.accent
                  : isDark
                  ? '#60A5FA'
                  : '#2563EB';

                return (
                  <View
                    key={tx.id}
                    style={[
                      styles.txRow,
                      !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
                    ]}
                  >
                    <View style={[styles.txIconContainer, { backgroundColor: iconBg }]}>
                      <Ionicons
                        name={
                          isExpense
                            ? 'arrow-up-outline'
                            : isIncome
                            ? 'arrow-down-outline'
                            : 'swap-horizontal-outline'
                        }
                        size={17}
                        color={iconColor}
                      />
                    </View>

                    <View style={styles.txDetails}>
                      <Text
                        style={[styles.txCategory, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {tx.category}
                      </Text>
                      <Text
                        style={[styles.txMeta, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {formatDate(tx.transactionDate)}
                        {tx.description ? ` • ${tx.description}` : ''}
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
                          ? '••••'
                          : `${isExpense ? '-' : isIncome ? '+' : ''}${formatMoney(tx.amount, tx.currency)}`}
                      </Text>
                      {tx.isPendingSync && (
                        <View style={styles.pendingBadgeRow}>
                          <Ionicons
                            name={tx.syncStatus === 'failed' ? 'alert-circle' : 'cloud-upload-outline'}
                            size={10}
                            color={tx.syncStatus === 'failed' ? colors.danger : colors.warning}
                          />
                          <Text
                            style={[
                              styles.pendingBadgeText,
                              { color: tx.syncStatus === 'failed' ? colors.danger : colors.warning },
                            ]}
                          >
                            {tx.syncStatus === 'failed' ? 'Failed' : 'Pending'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </Card>
          )}
        </FadeInView>
      </ScrollView>

      {/* Transaction creation modal */}
      <CreateTransactionModal
        visible={txModalVisible}
        onClose={() => setTxModalVisible(false)}
        defaultType={txDefaultType}
        onSuccess={() => {
          loadData();
          if (isTourActive && currentStepIndex === 2) {
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
          loadData();
          if (isTourActive && currentStepIndex === 0) {
            nextStep();
          }
        }}
      />

      {/* Interactive Spotlight Guided Tour */}
      <SpotlightTourModal
        isActionModalOpen={txModalVisible || lendingModalVisible || createAccountModalVisible}
        onActionTrigger={(action) => {
          if (action === 'create_account') {
            setCreateAccountModalVisible(true);
          } else if (action === 'record_transaction') {
            openTxModal('Expense');
          }
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
  balanceCard: {
    marginBottom: spacing.base + 2,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  balanceLabel: {
    ...typography.caption,
    letterSpacing: 0.8,
    fontWeight: '700',
    fontSize: 11,
  },
  balanceValue: {
    ...typography.display,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginVertical: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '500',
  },
  statIncome: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 13,
  },
  statExpense: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 13,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
    marginTop: spacing.base,
  },
  sectionTitle: {
    ...typography.label,
    letterSpacing: 0.8,
    fontSize: 11,
    fontWeight: '700',
  },
  viewAllText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingVertical: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  actionText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xxl,
    borderRadius: radius.lg,
  },
  emptyTitle: {
    ...typography.bodyLarge,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  txIconContainer: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  txDetails: {
    flex: 1,
    marginRight: spacing.sm,
  },
  txCategory: {
    ...typography.body,
    fontWeight: '600',
    fontSize: 14,
  },
  txMeta: {
    ...typography.caption,
    marginTop: 2,
    fontSize: 12,
  },
  txAmount: {
    ...typography.bodyLarge,
    fontWeight: '700',
    fontSize: 14,
  },
  txAmountContainer: {
    alignItems: 'flex-end',
  },
  pendingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  pendingBadgeText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  syncBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  syncBannerTexts: {
    flex: 1,
  },
  syncBannerTitle: {
    ...typography.caption,
    fontWeight: '700',
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
    fontWeight: '700',
    fontSize: 11,
  },
});
