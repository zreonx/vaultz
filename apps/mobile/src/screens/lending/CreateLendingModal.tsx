import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { lendingApi } from '@/api/lending';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useTheme } from '@/context/ThemeContext';
import { typography, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

interface CreateLendingModalProps {
  visible: boolean;
  onClose: () => void;
  defaultType?: 'Lent' | 'Borrowed';
  onSuccess?: () => void;
}

export const CreateLendingModal: React.FC<CreateLendingModalProps> = ({
  visible,
  onClose,
  defaultType = 'Lent',
  onSuccess,
}) => {
  const { activeWorkspace, refetchAll } = useWorkspace();
  const { colors, isDark } = useTheme();
  const [type, setType] = useState<'Lent' | 'Borrowed'>(defaultType);
  const [contactName, setContactName] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!activeWorkspace) {
      setError('Please create or select an account first');
      haptics.error();
      return;
    }

    if (!contactName.trim()) {
      setError('Contact / Person name is required');
      haptics.error();
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount');
      haptics.error();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await lendingApi.create({
        accountId: activeWorkspace.id,
        borrowerOrLenderName: contactName.trim(),
        type,
        totalAmount: parsedAmount,
        currency: activeWorkspace.currency || activeWorkspace.currencyCode || 'USD',
        notes: notes.trim() || undefined,
        dueDate: undefined,
      });

      haptics.success();
      await refetchAll();
      setContactName('');
      setAmount('');
      setNotes('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      haptics.error();
      setError(err.message || 'Failed to record loan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Record Loan / IOU"
      subtitle="Track money lent to or borrowed from others"
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

        {/* Type Segmented Control */}
        <View
          style={[
            styles.segmentedControl,
            {
              backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <PressableScale
            style={[
              styles.segmentBtn,
              type === 'Lent' && [
                styles.segmentBtnActive,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                },
              ],
            ]}
            onPress={() => {
              haptics.selection();
              setType('Lent');
            }}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: type === 'Lent' ? colors.accent : colors.textMuted,
                  fontWeight: type === 'Lent' ? '700' : '500',
                },
              ]}
            >
              I Lent (Owed to me)
            </Text>
          </PressableScale>

          <PressableScale
            style={[
              styles.segmentBtn,
              type === 'Borrowed' && [
                styles.segmentBtnActive,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                },
              ],
            ]}
            onPress={() => {
              haptics.selection();
              setType('Borrowed');
            }}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: type === 'Borrowed' ? colors.warning : colors.textMuted,
                  fontWeight: type === 'Borrowed' ? '700' : '500',
                },
              ]}
            >
              I Borrowed (I owe)
            </Text>
          </PressableScale>
        </View>

        <Input
          label={type === 'Lent' ? 'Debtor / Borrower Name' : 'Creditor / Lender Name'}
          placeholder="e.g. Alex Rivera, Mom, Dave"
          value={contactName}
          onChangeText={(val) => {
            setContactName(val);
            if (error) setError(null);
          }}
          leftIcon="person-outline"
          autoFocus
        />

        <Input
          label="Total Amount"
          placeholder="0.00"
          keyboardType="numeric"
          value={amount}
          onChangeText={(val) => {
            setAmount(val);
            if (error) setError(null);
          }}
          leftIcon="cash-outline"
        />

        <Input
          label="Notes / Description (Optional)"
          placeholder="e.g. For concert tickets, Split lunch"
          value={notes}
          onChangeText={setNotes}
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
            title="Save Loan"
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
