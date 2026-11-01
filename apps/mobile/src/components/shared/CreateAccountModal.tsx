import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors } from '@/theme/colors';
import { typography, radius, spacing } from '@/theme/tokens';
import { accountsApi } from '@/api/accounts';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useTutorial } from '@/context/TutorialContext';
import { haptics } from '@/utils/haptics';

interface CreateAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ACCOUNT_TYPES = ['Checking', 'Savings', 'CreditCard', 'Cash', 'Investment'];
const CURRENCIES = ['USD', 'PHP', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD'];

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { refreshAccounts, setActiveWorkspace } = useWorkspace();
  const { currentStep, advanceToStep } = useTutorial();
  const [name, setName] = useState('');
  const [type, setType] = useState('Checking');
  const [currency, setCurrency] = useState('USD');
  const [initialBalance, setInitialBalance] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Account name is required');
      haptics.error();
      return;
    }

    const parsedBalance = initialBalance.trim() ? parseFloat(initialBalance) : 0;
    if (isNaN(parsedBalance)) {
      setError('Initial balance must be a valid number');
      haptics.error();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const newAcc = await accountsApi.create({
        name: name.trim(),
        type,
        currency,
        initialBalance: parsedBalance,
      });

      haptics.success();
      await refreshAccounts();
      setActiveWorkspace(newAcc);
      if (currentStep === 'create_account') {
        advanceToStep('workspace_intro');
      }
      setName('');
      setInitialBalance('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      haptics.error();
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Create Account"
      subtitle="Add an isolated account container"
    >
      <View style={styles.container}>
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        <Input
          label="Account Name"
          placeholder="e.g. Main Checking, Savings, Pocket"
          value={name}
          onChangeText={(val) => {
            setName(val);
            if (error) setError(null);
          }}
          autoFocus
        />

        <Text style={styles.sectionLabel}>ACCOUNT TYPE</Text>
        <View style={styles.chipRow}>
          {ACCOUNT_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, type === t && styles.chipActive]}
              onPress={() => {
                haptics.selection();
                setType(t);
              }}
            >
              <Text style={[styles.chipText, type === t && styles.chipTextActive]}>
                {t === 'CreditCard' ? 'Credit Card' : t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>CURRENCY (ISO 4217)</Text>
        <View style={styles.chipRow}>
          {CURRENCIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, currency === c && styles.chipActive]}
              onPress={() => {
                haptics.selection();
                setCurrency(c);
              }}
            >
              <Text style={[styles.chipText, currency === c && styles.chipTextActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Initial Balance"
          placeholder="0.00"
          keyboardType="numeric"
          value={initialBalance}
          onChangeText={setInitialBalance}
          leftIcon="cash-outline"
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
            title="Create Account"
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
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'center',
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
    marginBottom: spacing.md,
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
