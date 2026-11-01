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
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { CreateTransactionModal } from './CreateTransactionModal';
import { transactionsApi } from '@/api/transactions';
import { TransactionDto, TransactionType } from '@/types/api';
import { colors } from '@/theme/colors';
import { typography, radius, spacing } from '@/theme/tokens';
import { formatMoney } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { haptics } from '@/utils/haptics';

const FILTER_TABS = ['All', 'Expense', 'Income', 'Transfer'] as const;

export const TransactionsScreen: React.FC = () => {
  const { activeWorkspace, hideBalance, refetchAll } = useWorkspace();
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

    return (
      <View style={styles.txRow}>
        <View
          style={[
            styles.txIconContainer,
            isExpense
              ? styles.iconExpense
              : isIncome
              ? styles.iconIncome
              : styles.iconTransfer,
          ]}
        >
          <Ionicons
            name={
              isExpense
                ? 'arrow-up-circle-outline'
                : isIncome
                ? 'arrow-down-circle-outline'
                : 'swap-horizontal-outline'
            }
            size={22}
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
          <Text style={styles.txCategory}>{categoryName}</Text>
          <Text style={styles.txMeta} numberOfLines={1}>
            {formatDate(txDate)}
            {item.description ? ` • ${item.description}` : ''}
          </Text>
        </View>

        <View style={styles.amountContainer}>
          <Text
            style={[
              styles.txAmount,
              isExpense && styles.amountExpense,
              isIncome && styles.amountIncome,
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
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes, categories..."
            placeholderTextColor={colors.textDisabled}
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
          {FILTER_TABS.map((tab) => (
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

        {/* Transactions List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Skeleton height={50} style={{ marginBottom: 8 }} />
            <Skeleton height={50} style={{ marginBottom: 8 }} />
            <Skeleton height={50} style={{ marginBottom: 8 }} />
            <Skeleton height={50} />
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
              <Card style={styles.emptyCard}>
                <Ionicons name="receipt-outline" size={32} color={colors.textDisabled} />
                <Text style={styles.emptyTitle}>No transactions found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? 'Try adjusting your search criteria.'
                    : 'Record your first transaction in this account.'}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 42,
    marginBottom: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 0,
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
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
  iconExpense: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  iconIncome: {
    backgroundColor: colors.accentMuted,
  },
  iconTransfer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
  amountContainer: {
    alignItems: 'flex-end',
  },
  txAmount: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  amountExpense: {
    color: colors.danger,
  },
  amountIncome: {
    color: colors.accent,
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
