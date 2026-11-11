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
import { useTheme } from '@/context/ThemeContext';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { CreateLendingModal } from './CreateLendingModal';
import { LogRepaymentModal } from './LogRepaymentModal';
import { lendingApi } from '@/api/lending';
import { LendingSummaryDto, LendingItemDto, LendingType, LendingStatus } from '@/types/api';
import { typography, radius, spacing } from '@/theme/tokens';
import { formatMoney } from '@/utils/currency';
import { haptics } from '@/utils/haptics';

const LENDING_TABS = ['All', 'Lent', 'Borrowed', 'Settled'] as const;

export const LendingScreen: React.FC = () => {
  const { activeWorkspace, hideBalance } = useWorkspace();
  const { colors, isDark } = useTheme();
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
            <Text style={[styles.contactName, { color: colors.textPrimary }]}>
              {item.borrowerOrLenderName || item.counterparty}
            </Text>
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
            <Text style={[styles.amountLabel, { color: colors.textMuted }]}>
              Remaining Balance
            </Text>
            <Text
              style={[
                styles.remainingAmount,
                { color: isLent ? colors.accent : colors.warning },
              ]}
            >
              {hideBalance ? '••••' : formatMoney(remainingBalance, curr)}
            </Text>
          </View>
          <View style={styles.totalSection}>
            <Text style={[styles.amountLabel, { color: colors.textMuted }]}>
              Total Principal
            </Text>
            <Text style={[styles.totalAmount, { color: colors.textSecondary }]}>
              {hideBalance ? '••••' : formatMoney(totalAmount, curr)}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBarBg,
              {
                backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
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
              ? '••••'
              : `${formatMoney(item.repaidAmount, curr)} paid (${Math.round(percentPaid)}%)`}
          </Text>
        </View>

        {item.notes && (
          <Text style={[styles.notesText, { color: colors.textSecondary }]} numberOfLines={2}>
            "{item.notes}"
          </Text>
        )}

        {/* Action Buttons if not settled */}
        {!isSettled && (
          <View style={[styles.actionRow, { borderTopColor: colors.borderSubtle }]}>
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
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              OWED TO YOU
            </Text>
            <Text style={[styles.summaryValue, { color: colors.accent }]}>
              {hideBalance ? '••••' : formatMoney(summary?.totalLent ?? 0, currency)}
            </Text>
          </Card>

          <Card style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              YOU OWE
            </Text>
            <Text style={[styles.summaryValue, { color: colors.warning }]}>
              {hideBalance ? '••••' : formatMoney(summary?.totalBorrowed ?? 0, currency)}
            </Text>
          </Card>
        </View>

        {/* Status Filter Tabs */}
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
                    borderColor: isActive ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => handleTabChange(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: isActive ? colors.accent : colors.textSecondary,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {tab}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        {/* List of items */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Skeleton height={140} style={{ marginBottom: 12, borderRadius: radius.lg }} />
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
                <Ionicons name="people-outline" size={36} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  No loans or IOUs found
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  Track money you lend to friends or borrow from colleagues.
                </Text>
              </Card>
            }
          />
        )}

        {/* Floating Action Button */}
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
        >
          <Ionicons name="add" size={26} color={colors.accentForeground} />
        </PressableScale>
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
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
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
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    ...typography.title,
    fontSize: 20,
    fontWeight: '800',
  },
  filterTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tabBtn: {
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  tabText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  nameContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  contactName: {
    ...typography.title,
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 11,
    marginBottom: 2,
  },
  remainingAmount: {
    ...typography.title,
    fontSize: 20,
    fontWeight: '800',
  },
  totalSection: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    ...typography.body,
    fontWeight: '600',
    fontSize: 14,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    ...typography.caption,
    fontSize: 11,
  },
  notesText: {
    ...typography.caption,
    fontStyle: 'italic',
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
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
    padding: spacing.xxl,
    marginTop: spacing.lg,
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
  fab: {
    position: 'absolute',
    right: spacing.base,
    bottom: spacing.xxl + spacing.md,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
