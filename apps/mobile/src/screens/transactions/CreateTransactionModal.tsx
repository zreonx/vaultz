import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors } from '@/theme/colors';
import { typography, radius, spacing } from '@/theme/tokens';
import { transactionsApi } from '@/api/transactions';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useTutorial } from '@/context/TutorialContext';
import { haptics } from '@/utils/haptics';

interface CreateTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  defaultType?: 'Expense' | 'Income' | 'Transfer';
  onSuccess?: () => void;
}

const COMMON_CATEGORIES = {
  Expense: ['Food & Dining', 'Groceries', 'Transport', 'Utilities', 'Shopping', 'Entertainment', 'Healthcare', 'Housing', 'Other'],
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
  const { currentStep, advanceToStep } = useTutorial();
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

      await transactionsApi.create({
        accountId: activeWorkspace.id,
        type,
        amount: parsedAmount,
        currency: activeWorkspace.currency,
        category,
        description: description.trim() || undefined,
        transactionDate: new Date().toISOString(),
        destinationAccountId: type === 'Transfer' ? destinationAccountId : undefined,
      });

      haptics.success();
      await refetchAll();
      if (currentStep === 'record_transaction') {
        advanceToStep('completed');
      }
      setAmount('');
      setDescription('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      haptics.error();
      setError(err.message || 'Failed to record transaction');
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
      subtitle={`Posting to ${activeWorkspace?.name || 'Account'}`}
    >
      <View style={styles.container}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Type Selector (Segmented control) */}
        <View style={styles.segmentedControl}>
          {(['Expense', 'Income', 'Transfer'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.segmentBtn, type === t && styles.segmentBtnActive]}
              onPress={() => handleTypeChange(t)}
            >
              <Text
                style={[
                  styles.segmentText,
                  type === t && styles.segmentTextActive,
                  type === t && t === 'Expense' && { color: colors.danger },
                  type === t && t === 'Income' && { color: colors.accent },
                  type === t && t === 'Transfer' && { color: '#60A5FA' },
                ]}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount Input */}
        <Input
          label={`Amount (${activeWorkspace?.currency || 'USD'})`}
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={(val) => {
            setAmount(val);
            if (error) setError(null);
          }}
          leftIcon="cash-outline"
          autoFocus
        />

        {/* Transfer Destination Picker */}
        {type === 'Transfer' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TRANSFER TO</Text>
            <View style={styles.chipRow}>
              {otherAccounts.length === 0 ? (
                <Text style={styles.emptyText}>Create another account first to transfer funds.</Text>
              ) : (
                otherAccounts.map((acc) => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.chip,
                      destinationAccountId === acc.id && styles.chipActive,
                    ]}
                    onPress={() => {
                      haptics.selection();
                      setDestinationAccountId(acc.id);
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        destinationAccountId === acc.id && styles.chipTextActive,
                      ]}
                    >
                      {acc.name} ({acc.currency})
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}

        {/* Category Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CATEGORY</Text>
          <View style={styles.chipRow}>
            {COMMON_CATEGORIES[type].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => {
                  haptics.selection();
                  setCategory(cat);
                }}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description Input */}
        <Input
          label="Note / Description (Optional)"
          placeholder="e.g. Dinner with friends, Uber ride"
          value={description}
          onChangeText={setDescription}
          leftIcon="reader-outline"
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
    paddingBottom: spacing.md,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceHover,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentTextActive: {
    fontWeight: '700',
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
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
