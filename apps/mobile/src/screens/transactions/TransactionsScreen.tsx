import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useTheme } from '@/context/ThemeContext';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { PressableScale } from '@/components/ui/PressableScale';
import { FadeInView } from '@/components/ui/FadeInView';
import { CreateTransactionModal } from './CreateTransactionModal';
import { transactionsApi } from '@/api/transactions';
import { TransactionDto, TransactionType } from '@/types/api';
import { typography, radius, spacing } from '@/theme/tokens';
import { formatMoney } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { haptics } from '@/utils/haptics';

const FILTER_TABS = ['All', 'Expense', 'Income', 'Transfer'] as const;

export const TransactionsScreen: React.FC = () => {
  const { activeWorkspace, hideBalance, refetchAll } = useWorkspace();
  const { colors, isDark } = useTheme();
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [selectedTab, setSelectedTab] = useState<typeof FILTER_TABS[number]>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      const res = await transactionsApi.list({
        accountId: activeWorkspace?.id,
        type: selectedTab === 'All' ? undefined : selectedTab,
        searchTerm: searchQuery.trim() || undefined,
        page: 1,
        pageSize: 50,
      });
      setTransactions(res.items || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace?.id, selectedTab, searchQuery]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const onRefresh = async () => {
    setRefreshing(true);
    haptics.light();
    await Promise.all([refetchAll(), loadTransactions()]);
    setRefreshing(false);
  };

  const handleTabChange = (tab: typeof FILTER_TABS[number]) => {
    haptics.selection();
    setSelectedTab(tab);
  };

  const renderTransactionItem = ({ item }: { item: TransactionDto }) => {
    const isExpense = item.type === TransactionType.Expense || item.typeName === 'Expense';
    const isIncome = item.type === TransactionType.Income || item.typeName === 'Income';
    const curr = item.currency || item.currencyCode;
    const categoryName = item.category || item.categoryName || 'General';
    const txDate = item.transactionDate || item.occurredOn || item.createdAtUtc;

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
        style={[
          styles.txRow,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
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
            size={18}
            color={iconColor}
          />
        </View>

        <View style={styles.txDetails}>
          <Text
            style={[styles.txCategory, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {categoryName}
          </Text>
          <Text
            style={[styles.txMeta, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {formatDate(txDate)}
            {item.description ? ` • ${item.description}` : ''}
          </Text>
        </View>

        <View style={styles.amountContainer}>
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
              : `${isExpense ? '-' : isIncome ? '+' : ''}${formatMoney(item.amount, curr)}`}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <Header />

      <View style={styles.container}>
        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search notes, categories..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            selectionColor={colors.accent}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {FILTER_TABS.map((tab) => {
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

        {/* Transactions List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Skeleton height={58} style={{ marginBottom: 8, borderRadius: radius.md }} />
            <Skeleton height={58} style={{ marginBottom: 8, borderRadius: radius.md }} />
            <Skeleton height={58} style={{ marginBottom: 8, borderRadius: radius.md }} />
            <Skeleton height={58} style={{ borderRadius: radius.md }} />
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={renderTransactionItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
                colors={[colors.accent]}
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <Card
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="receipt-outline" size={36} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  No transactions found
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  {searchQuery
                    ? 'Try adjusting your search query or filter.'
                    : 'Record your first transaction in this account.'}
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

      <CreateTransactionModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={loadTransactions}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: 0,
    fontSize: 14,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  tabText: {
    ...typography.caption,
    fontSize: 12,
  },
  loadingContainer: {
    paddingTop: spacing.xs,
  },
  listContent: {
    paddingBottom: spacing.xxl * 3,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
  },
  separator: {
    height: spacing.sm,
  },
  txIconContainer: {
    width: 38,
    height: 38,
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
  amountContainer: {
    alignItems: 'flex-end',
  },
  txAmount: {
    ...typography.bodyLarge,
    fontWeight: '700',
    fontSize: 15,
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
