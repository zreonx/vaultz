import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useTheme } from '@/context/ThemeContext';
import { accountsApi } from '@/api/accounts';
import { typography, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { AccountResponse, AccountDto } from '@/types/api';

interface EditAccountModalProps {
  visible: boolean;
  account: AccountResponse | AccountDto | null;
  onClose: () => void;
  onSuccess?: (updated: AccountResponse) => void;
}

const ACCOUNT_TYPES = ['Checking', 'Savings', 'CreditCard', 'Cash', 'Investment'];

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  visible,
  account,
  onClose,
  onSuccess,
}) => {
  const { refreshAccounts, activeWorkspace, setActiveWorkspace, accounts } = useWorkspace();
  const { colors, isDark } = useTheme();

  const [name, setName] = useState('');
  const [type, setType] = useState('Checking');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account && visible) {
      setName(account.name);
      setType(account.typeName || String(account.type));
      setError(null);
    }
  }, [account, visible]);

  if (!account) return null;

  const currencyCode = account.currency || account.currencyCode || 'USD';

  const handleDelete = () => {
    if (accounts.length <= 1) {
      Alert.alert(
        'Cannot Delete Account',
        'You cannot delete your only account. Vaultz requires at least one active account to function.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Account',
      `Are you sure you want to permanently delete "${account.name}"? All transactions, budgets, and allocations for this account will be erased. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              setError(null);
              await accountsApi.deleteAccount(account.id);
              haptics.success();
              await refreshAccounts();
              onClose();
            } catch (err: any) {
              haptics.error();
              setError(err.message || 'Failed to delete account');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Account name is required');
      haptics.error();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const updated = await accountsApi.updateAccount(account.id, {
        name: name.trim(),
        type,
      });

      haptics.success();
      await refreshAccounts();

      if (activeWorkspace?.id === account.id) {
        setActiveWorkspace(updated);
      }

      onClose();
      if (onSuccess) onSuccess(updated);
    } catch (err: any) {
      haptics.error();
      setError(err.message || 'Failed to update account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Edit Account"
      subtitle="Update account name and classification"
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

        {/* Account Name */}
        <Input
          label="Account Name"
          placeholder="e.g. Primary Checking, Cash Stash"
          value={name}
          onChangeText={(val) => {
            setName(val);
            if (error) setError(null);
          }}
          leftIcon="wallet-outline"
          autoFocus
        />

        {/* Account Type Selector */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          ACCOUNT CLASSIFICATION
        </Text>
        <View style={styles.chipRow}>
          {ACCOUNT_TYPES.map((t) => {
            const isActive = type.toLowerCase() === t.toLowerCase();
            return (
              <PressableScale
                key={t}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive
                      ? colors.accentSoft
                      : isDark
                      ? colors.surfaceSubtle
                      : colors.surfaceMuted,
                    borderColor: isActive ? colors.accent : colors.borderSubtle,
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

        {/* Read-only Currency Notice */}
        <View
          style={[
            styles.currencyInfoBox,
            {
              backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.currencyInfoLeft}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.currencyInfoLabel, { color: colors.textMuted }]}>
              BASE CURRENCY
            </Text>
          </View>
          <View
            style={[
              styles.currencyBadge,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Text style={[styles.currencyBadgeText, { color: colors.textPrimary }]}>
              {currencyCode}
            </Text>
          </View>
        </View>
        <Text style={[styles.currencyHint, { color: colors.textMuted }]}>
          Currency is fixed to preserve the mathematical integrity of your personal ledger.
        </Text>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <Button
            title="Cancel"
            variant="ghost"
            onPress={onClose}
            style={styles.cancelBtn}
            disabled={isLoading}
          />
          <Button
            title="Save Changes"
            variant="primary"
            onPress={handleSubmit}
            isLoading={isLoading}
            style={styles.submitBtn}
          />
        </View>

        {/* Delete Account */}
        {accounts.length > 1 && (
          <View style={styles.deleteWrapper}>
            <Button
              title="Delete Account"
              variant="ghost"
              leftIcon="trash-outline"
              onPress={handleDelete}
              disabled={isLoading}
              textStyle={{ color: colors.danger, fontWeight: '600' }}
            />
          </View>
        )}
      </View>
    </ModalSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.lg,
  },
  deleteWrapper: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    fontWeight: '500',
  },
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {
    ...typography.caption,
  },
  currencyInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
  },
  currencyInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  currencyInfoLabel: {
    ...typography.caption,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  currencyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  currencyBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  currencyHint: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
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
