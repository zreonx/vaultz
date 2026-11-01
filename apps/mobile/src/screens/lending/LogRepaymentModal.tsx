import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors } from '@/theme/colors';
import { typography, radius, spacing } from '@/theme/tokens';
import { lendingApi } from '@/api/lending';
import { formatMoney } from '@/utils/currency';
import { haptics } from '@/utils/haptics';
import { LendingItemDto, LendingType } from '@/types/api';

interface LogRepaymentModalProps {
  visible: boolean;
  item: LendingItemDto | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LogRepaymentModal: React.FC<LogRepaymentModalProps> = ({
  visible,
  item,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!item) return null;

  const remainingBalance = item.remainingBalance ?? item.remainingAmount ?? 0;
  const curr = item.currency || item.currencyCode;
  const isLent = item.type === LendingType.Lent || item.typeName === 'Lent';
  const contactName = item.borrowerOrLenderName || item.counterparty;

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive repayment amount');
      haptics.error();
      return;
    }

    if (parsedAmount > remainingBalance) {
      setError(`Amount cannot exceed remaining balance (${formatMoney(remainingBalance, curr)})`);
      haptics.error();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await lendingApi.logRepayment(item.id, {
        amount: parsedAmount,
        repaymentDate: new Date().toISOString(),
        notes: notes.trim() || undefined,
      });

      haptics.success();
      setAmount('');
      setNotes('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      haptics.error();
      setError(err.message || 'Failed to record repayment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Record Repayment"
      subtitle={`${isLent ? 'Received from' : 'Paid to'} ${contactName}`}
    >
      <View style={styles.container}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Remaining Balance</Text>
          <Text style={styles.infoValue}>{formatMoney(remainingBalance, curr)}</Text>
        </View>

        <Input
          label={`Repayment Amount (${curr})`}
          placeholder={remainingBalance.toFixed(2)}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={(val) => {
            setAmount(val);
            if (error) setError(null);
          }}
          leftIcon="cash-outline"
          autoFocus
        />

        <Input
          label="Notes (Optional)"
          placeholder="e.g. Bank transfer, Cash"
          value={notes}
          onChangeText={setNotes}
          leftIcon="document-text-outline"
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
            title="Record Repayment"
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
  infoCard: {
    backgroundColor: colors.surfaceHover,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    ...typography.title,
    fontSize: 20,
    color: colors.accent,
    fontWeight: '700',
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
