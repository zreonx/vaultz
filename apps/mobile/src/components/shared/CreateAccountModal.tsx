import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useTheme } from '@/context/ThemeContext';
import { accountsApi } from '@/api/accounts';
import { typography, radius, spacing } from '@/theme/tokens';
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
  const { colors, isDark } = useTheme();
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
      subtitle="Add an isolated financial container"
    >
      <View style={styles.container}>
        {error && (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: colors.dangerSoft,
                borderColor: colors.danger,
              },
            ]}
          >
            <Text style={[styles.errorBannerText, { color: colors.danger }]}>{error}</Text>
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

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          ACCOUNT TYPE
        </Text>
        <View style={styles.chipRow}>
          {ACCOUNT_TYPES.map((t) => {
            const isActive = type === t;
            return (
              <PressableScale
                key={t}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive
                      ? colors.accentMuted
                      : isDark
                      ? colors.surfaceSubtle
                      : colors.surfaceMuted,
                    borderColor: isActive ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => {
                  haptics.selection();
                  setType(t);
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isActive ? colors.accent : colors.textSecondary,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {t === 'CreditCard' ? 'Credit Card' : t}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          CURRENCY (ISO 4217)
        </Text>
        <View style={styles.chipRow}>
          {CURRENCIES.map((c) => {
            const isActive = currency === c;
            return (
              <PressableScale
                key={c}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive
                      ? colors.accentMuted
                      : isDark
                      ? colors.surfaceSubtle
                      : colors.surfaceMuted,
                    borderColor: isActive ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => {
                  haptics.selection();
                  setCurrency(c);
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isActive ? colors.accent : colors.textSecondary,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {c}
                </Text>
              </PressableScale>
            );
          })}
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
    paddingBottom: spacing.sm,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    ...typography.caption,
    textAlign: 'center',
    fontWeight: '500',
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
    marginBottom: spacing.md,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {
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
