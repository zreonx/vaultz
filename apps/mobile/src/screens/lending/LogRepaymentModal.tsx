import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/context/ThemeContext';
import { lendingApi } from '@/api/lending';
import { typography, radius, spacing } from '@/theme/tokens';
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
  const { colors, isDark } = useTheme();
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
      subtitle={`${isLent ? 'Repayment received from' : 'Payment made to'} ${contactName}`}
    >
      <View style={styles.container}>
        {/* Remaining Balance Summary Pill */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
            OUTSTANDING BALANCE
          </Text>
          <Text style={[styles.infoValue, { color: isLent ? colors.accent : colors.warning }]}>
            {formatMoney(remainingBalance, curr)}
          </Text>
        </View>

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

        <Input
          label="Repayment Amount"
          placeholder="0.00"
          keyboardType="numeric"
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
          placeholder="e.g. Bank transfer, Cash in hand"
          value={notes}
          onChangeText={setNotes}
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
    paddingBottom: spacing.sm,
  },
  infoCard: {
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    alignItems: 'center',
  },
  infoLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  infoValue: {
    ...typography.title,
    fontSize: 22,
    fontWeight: '800',
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
