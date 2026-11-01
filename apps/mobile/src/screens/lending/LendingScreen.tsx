import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspace } from '@/context/WorkspaceContext';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { CreateLendingModal } from './CreateLendingModal';
import { LogRepaymentModal } from './LogRepaymentModal';
import { lendingApi } from '@/api/lending';
import { LendingSummaryDto, LendingItemDto, LendingType, LendingStatus } from '@/types/api';
import { colors } from '@/theme/colors';
import { typography, radius, spacing } from '@/theme/tokens';
import { formatMoney } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { haptics } from '@/utils/haptics';

const LENDING_TABS = ['All', 'Lent', 'Borrowed', 'Settled'] as const;

export const LendingScreen: React.FC = () => {
  const { activeWorkspace, hideBalance } = useWorkspace();
  const [summary, setSummary] = useState<LendingSummaryDto | null>(null);
  const [items, setItems] = useState<LendingItemDto[]>([]);
  const [selectedTab, setSelectedTab] = useState<typeof LENDING_TABS[number]>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [repaymentModalVisible, setRepaymentModalVisible] = useState(false);
  const [selectedItemForRepay, setSelectedItemForRepay] = useState<LendingItemDto | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [sumRes, itemsRes] = await Promise.all([
        lendingApi.getSummary(activeWorkspace?.id),
        lendingApi.list({
          accountId: activeWorkspace?.id,
          type: selectedTab === 'Lent' || selectedTab === 'Borrowed' ? selectedTab : undefined,
          status: selectedTab === 'Settled' ? 'Settled' : undefined,
        }),
      ]);
      setSummary(sumRes);
      setItems(itemsRes);
    } catch (err) {
      console.error('Failed to load lending data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace?.id, selectedTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    haptics.light();
    await loadData();
    setRefreshing(false);
  };

  const handleTabChange = (tab: typeof LENDING_TABS[number]) => {
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
    Alert.alert(
      'Mark as Settled',
      `Are you sure you want to mark the remaining balance of ${formatMoney(bal, curr)} as fully settled?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle',
          style: 'destructive',
          onPress: async () => {
            try {
              haptics.medium();
              await lendingApi.settle(item.id);
              haptics.success();
              await loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to settle loan');
            }
          },
        },
      ]
    );
  };

  const currency = activeWorkspace?.currency || activeWorkspace?.currencyCode || 'USD';

  const renderLendingCard = ({ item }: { item: LendingItemDto }) => {
    const isLent = item.type === LendingType.Lent || item.typeName === 'Lent';
    const isSettled = item.status === LendingStatus.Settled || item.statusName === 'Settled';
    const totalAmount = item.totalAmount ?? item.originalAmount ?? 1;
    const remainingBalance = item.remainingBalance ?? item.remainingAmount ?? 0;
    const percentPaid = Math.min(100, Math.max(0, (item.repaidAmount / totalAmount) * 100));
    const curr = item.currency || item.currencyCode;

    return (
      <Card style={styles.itemCard}>
        {/* Top Row: Name and Status Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.nameContainer}>
            <Text style={styles.contactName}>{item.borrowerOrLenderName || item.counterparty}</Text>
            <Badge
              label={isLent ? 'Lent (You are owed)' : 'Borrowed (You owe)'}
              variant={isLent ? 'success' : 'warning'}
              style={styles.typeBadge}
            />
          </View>
          <Badge
            label={item.statusName || String(item.status)}
            variant={isSettled ? 'outline' : 'info'}
          />
        </View>

        {/* Amounts Row */}
        <View style={styles.amountSection}>
          <View>
            <Text style={styles.amountLabel}>Remaining Balance</Text>
            <Text
              style={[
                styles.remainingAmount,
                isLent ? styles.textLent : styles.textBorrowed,
              ]}
            >
              {hideBalance ? '••••' : formatMoney(remainingBalance, curr)}
            </Text>
          </View>
          <View style={styles.totalSection}>
            <Text style={styles.amountLabel}>Total Principal</Text>
            <Text style={styles.totalAmount}>
              {hideBalance ? '••••' : formatMoney(totalAmount, curr)}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
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
          <Text style={styles.progressText}>
            {hideBalance
              ? '••••'
              : `${formatMoney(item.repaidAmount, curr)} paid (${Math.round(percentPaid)}%)`}
          </Text>
        </View>

        {item.notes && (
          <Text style={styles.notesText} numberOfLines={2}>
            "{item.notes}"
          </Text>
        )}

        {/* Action Buttons if not settled */}
        {!isSettled && (
          <View style={styles.actionRow}>
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
      <Header />

      <View style={styles.container}>
        {/* Summary Overview */}
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>TOTAL LENT (OWED TO YOU)</Text>
            <Text style={[styles.summaryValue, styles.textLent]}>
              {hideBalance ? '••••' : formatMoney(summary?.totalLent ?? 0, currency)}
            </Text>
          </Card>

          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>TOTAL BORROWED (YOU OWE)</Text>
            <Text style={[styles.summaryValue, styles.textBorrowed]}>
              {hideBalance ? '••••' : formatMoney(summary?.totalBorrowed ?? 0, currency)}
            </Text>
          </Card>
        </View>

        {/* Status Filter Tabs */}
        <View style={styles.filterTabs}>
          {LENDING_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabBtn,
                selectedTab === tab && styles.tabBtnActive,
              ]}
              onPress={() => handleTabChange(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tab && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List of items */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Skeleton height={140} style={{ marginBottom: 12 }} />
            <Skeleton height={140} />
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
                <Ionicons name="people-outline" size={32} color={colors.textDisabled} />
                <Text style={styles.emptyTitle}>No loans or IOUs found</Text>
                <Text style={styles.emptySubtitle}>
                  Keep track of money you lend to friends or borrow from others.
                </Text>
              </Card>
            }
          />
        )}

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            haptics.light();
            setCreateModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={26} color={colors.background} />
        </TouchableOpacity>
      </View>

      <CreateLendingModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={loadData}
      />

      <LogRepaymentModal
        visible={repaymentModalVisible}
        item={selectedItemForRepay}
        onClose={() => {
          setRepaymentModalVisible(false);
          setSelectedItemForRepay(null);
        }}
        onSuccess={loadData}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: spacing.md,
  },
  summaryLabel: {
    ...typography.caption,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '700',
  },
  textLent: {
    color: colors.accent,
  },
  textBorrowed: {
    color: colors.warning,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tabBtn: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtnActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  tabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingTop: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xxl * 3,
  },
  itemCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  nameContainer: {
    flex: 1,
  },
  contactName: {
    ...typography.title,
    fontSize: 17,
    color: colors.textPrimary,
  },
  typeBadge: {
    marginTop: 4,
  },
  amountSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  amountLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  remainingAmount: {
    ...typography.heading,
    fontSize: 22,
    fontWeight: '800',
  },
  totalSection: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceHover,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  notesText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  actionBtn: {
    flex: 2,
  },
  settleBtn: {
    flex: 1,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.lg,
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
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xxl + spacing.sm,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
