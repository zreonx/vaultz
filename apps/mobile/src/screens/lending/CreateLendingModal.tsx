import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors } from '@/theme/colors';
import { typography, radius, spacing } from '@/theme/tokens';
import { lendingApi } from '@/api/lending';
import { useWorkspace } from '@/context/WorkspaceContext';
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
  const [type, setType] = useState<'Lent' | 'Borrowed'>(defaultType);
  const [contactName, setContactName] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
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
        borrowerOrLenderName: contactName.trim(),
        type,
        totalAmount: parsedAmount,
        currency: activeWorkspace?.currency || 'USD',
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
      setError(err.message || 'Failed to create lending record');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Record Loan / IOU"
      subtitle={type === 'Lent' ? 'Money you lent to someone' : 'Money you borrowed from someone'}
    >
      <View style={styles.container}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Type toggle */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, type === 'Lent' && styles.segmentBtnActive]}
            onPress={() => {
              haptics.selection();
              setType('Lent');
            }}
          >
            <Text
              style={[
                styles.segmentText,
                type === 'Lent' && { color: colors.accent, fontWeight: '700' },
              ]}
            >
              I Lent (Owed to Me)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, type === 'Borrowed' && styles.segmentBtnActive]}
            onPress={() => {
              haptics.selection();
              setType('Borrowed');
            }}
          >
            <Text
              style={[
                styles.segmentText,
                type === 'Borrowed' && { color: colors.warning, fontWeight: '700' },
              ]}
            >
              I Borrowed (I Owe)
            </Text>
          </TouchableOpacity>
        </View>

        <Input
          label="Contact / Person Name"
          placeholder="e.g. Alex Smith, Landlord"
          value={contactName}
          onChangeText={(val) => {
            setContactName(val);
            if (error) setError(null);
          }}
          leftIcon="person-outline"
          autoFocus
        />

        <Input
          label={`Principal Amount (${activeWorkspace?.currency || 'USD'})`}
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={(val) => {
            setAmount(val);
            if (error) setError(null);
          }}
          leftIcon="cash-outline"
        />

        <Input
          label="Notes / Reason (Optional)"
          placeholder="e.g. Split lunch, rent share"
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
            title="Save Record"
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
