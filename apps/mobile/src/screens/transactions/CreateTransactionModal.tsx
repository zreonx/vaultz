import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { transactionsApi } from '@/api/transactions';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useOfflineSync } from '@/context/OfflineSyncContext';
import { useTheme } from '@/context/ThemeContext';
import { typography, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

interface CreateTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  defaultType?: 'Expense' | 'Income' | 'Transfer';
  onSuccess?: () => void;
}

const COMMON_CATEGORIES = {
  Expense: [
    'Food & Dining',
    'Groceries',
    'Transport',
    'Utilities',
    'Shopping',
    'Entertainment',
    'Healthcare',
    'Housing',
    'Other',
  ],
  Income: ['Salary', 'Freelance', 'Investments', 'Gift', 'Refund', 'Other'],
  Transfer: ['Account Transfer', 'Savings Allocation', 'Debt Payment', 'Other'],
};

export const CreateTransactionModal: React.FC<CreateTransactionModalProps> = ({
  visible,
  onClose,
  defaultType = 'Expense',
  onSuccess,
}) => {
  const { activeWorkspace, accounts, refetchAll } = useWorkspace();
  const { enqueueTransaction } = useOfflineSync();
  const { colors, isDark } = useTheme();
  const [type, setType] = useState<'Expense' | 'Income' | 'Transfer'>(defaultType);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(COMMON_CATEGORIES[defaultType][0]);
  const [description, setDescription] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTypeChange = (newType: 'Expense' | 'Income' | 'Transfer') => {
    haptics.selection();
    setType(newType);
    setCategory(COMMON_CATEGORIES[newType][0]);
  };

  const handleSubmit = async () => {
    if (!activeWorkspace) {
      setError('No active account selected');
      haptics.error();
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount');
      haptics.error();
      return;
    }

    if (type === 'Transfer' && !destinationAccountId) {
      setError('Please select a destination account for the transfer');
      haptics.error();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const destAccount = accounts.find((a) => a.id === destinationAccountId);

      // Save locally to offline queue (which automatically attempts sync in background)
      await enqueueTransaction({
        accountId: activeWorkspace.id,
        accountName: activeWorkspace.name,
        currency: activeWorkspace.currency || 'USD',
        type,
        amount: parsedAmount,
        category,
        description: description.trim() || undefined,
        transactionDate: new Date().toISOString(),
        destinationAccountId: type === 'Transfer' ? destinationAccountId : undefined,
        destinationAccountName: destAccount?.name,
      });

      haptics.success();
      setAmount('');
      setDescription('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      haptics.error();
      setError(err.message || 'Failed to save transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const otherAccounts = accounts.filter((a) => a.id !== activeWorkspace?.id);

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Record Transaction"
      subtitle={`Adding to ${activeWorkspace?.name || 'Active Account'}`}
    >
      <View style={styles.container}>
        {error && (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: colors.dangerSoft,
                borderColor: colors.danger,
              },
            ]}
          >
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        {/* Segmented Control for Type */}
        <View
          style={[
            styles.segmentedControl,
            {
              backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          {(['Expense', 'Income', 'Transfer'] as const).map((t) => {
            const isActive = type === t;
            return (
              <PressableScale
                key={t}
                style={[
                  styles.segmentBtn,
                  isActive && [
                    styles.segmentBtnActive,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderSubtle,
                    },
                  ],
                ]}
                onPress={() => handleTypeChange(t)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: isActive
                        ? t === 'Expense'
                          ? colors.danger
                          : t === 'Income'
                          ? colors.accent
                          : isDark
                          ? '#60A5FA'
                          : '#2563EB'
                        : colors.textMuted,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {t}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        {/* Amount Input */}
        <Input
          label="Amount"
          placeholder="0.00"
          keyboardType="numeric"
          value={amount}
          onChangeText={(val) => {
            setAmount(val);
            if (error) setError(null);
          }}
          currencyCode={activeWorkspace?.currency || activeWorkspace?.currencyCode || 'USD'}
          autoFocus
        />

        {/* Destination Account Selection for Transfer */}
        {type === 'Transfer' && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              TRANSFER TO ACCOUNT
            </Text>
            {otherAccounts.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No other accounts available. Create another account first.
              </Text>
            ) : (
              <View style={styles.chipRow}>
                {otherAccounts.map((acc) => {
                  const isSelected = destinationAccountId === acc.id;
                  return (
                    <PressableScale
                      key={acc.id}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected
                            ? colors.accentMuted
                            : isDark
                            ? colors.surfaceSubtle
                            : colors.surfaceMuted,
                          borderColor: isSelected ? colors.accent : colors.border,
                        },
                      ]}
                      onPress={() => {
                        haptics.selection();
                        setDestinationAccountId(acc.id);
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected ? colors.accent : colors.textSecondary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {acc.name}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Category Chips */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            CATEGORY
          </Text>
          <View style={styles.chipRow}>
            {COMMON_CATEGORIES[type].map((cat) => {
              const isSelected = category === cat;
              return (
                <PressableScale
                  key={cat}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? colors.accentMuted
                        : isDark
                        ? colors.surfaceSubtle
                        : colors.surfaceMuted,
                      borderColor: isSelected ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => {
                    haptics.selection();
                    setCategory(cat);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected ? colors.accent : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>

        {/* Description Input */}
        <Input
          label="Note / Description (Optional)"
          placeholder="e.g. Dinner with friends, Grocery haul"
          value={description}
          onChangeText={setDescription}
          leftIcon="reader-outline"
          multiline
          numberOfLines={3}
        />

        <View style={styles.buttonRow}>
          <Button
            title="Cancel"
            variant="ghost"
            onPress={onClose}
            style={styles.cancelBtn}
            disabled={isLoading}
          />
          <Button
            title={`Save ${type}`}
            variant="primary"
            onPress={handleSubmit}
            isLoading={isLoading}
            style={styles.submitBtn}
          />
        </View>
      </View>
    </ModalSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.sm,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    textAlign: 'center',
    fontWeight: '500',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.base,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  segmentBtnActive: {
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 0,
  },
  segmentText: {
    ...typography.caption,
    fontSize: 12,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: spacing.sm + 3,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    ...typography.caption,
    fontSize: 12,
  },
  emptyText: {
    ...typography.caption,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 2,
  },
});
