import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspace } from '@/context/WorkspaceContext';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { colors } from '@/theme/colors';
import { typography, radius, spacing } from '@/theme/tokens';
import { formatMoney } from '@/utils/currency';
import { haptics } from '@/utils/haptics';
import { AccountDto } from '@/types/api';

interface AccountPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenCreateAccount: () => void;
}

export const AccountPickerModal: React.FC<AccountPickerModalProps> = ({
  visible,
  onClose,
  onOpenCreateAccount,
}) => {
  const { accounts, activeWorkspace, setActiveWorkspace, hideBalance } = useWorkspace();

  const handleSelectAccount = (account: AccountDto) => {
    haptics.selection();
    setActiveWorkspace(account);
    onClose();
  };

  const handleCreateNew = () => {
    haptics.light();
    onClose();
    onOpenCreateAccount();
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Switch Account"
      subtitle="Each account operates in strict personal isolation"
    >
      <View style={styles.container}>
        <View style={styles.accountList}>
          {accounts.map((acc) => {
            const isSelected = activeWorkspace?.id === acc.id;
            return (
              <TouchableOpacity
                key={acc.id}
                style={[styles.accountItem, isSelected && styles.accountItemSelected]}
                onPress={() => handleSelectAccount(acc)}
                activeOpacity={0.7}
              >
                <View style={styles.accountIconContainer}>
                  <Ionicons
                    name={(acc.typeName || String(acc.type)).toLowerCase().includes('credit') ? 'card-outline' : 'wallet-outline'}
                    size={20}
                    color={isSelected ? colors.accent : colors.textSecondary}
                  />
                </View>

                <View style={styles.accountDetails}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.accountName, isSelected && styles.accountNameSelected]}>
                      {acc.name}
                    </Text>
                    {acc.isDefault && <Badge label="Default" variant="outline" style={styles.badge} />}
                  </View>
                  <Text style={styles.accountType}>{acc.typeName || String(acc.type)} • {acc.currency || acc.currencyCode}</Text>
                </View>

                <View style={styles.accountBalanceContainer}>
                  <Text style={[styles.accountBalance, isSelected && styles.accountBalanceSelected]}>
                    {hideBalance ? '••••••' : formatMoney(acc.currentBalance ?? acc.balance ?? 0, acc.currency || acc.currencyCode)}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.accent} style={styles.checkIcon} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          title="Create New Account"
          variant="secondary"
          leftIcon="add-outline"
          onPress={handleCreateNew}
          style={styles.createButton}
        />
      </View>
    </ModalSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.md,
  },
  accountList: {
    marginBottom: spacing.lg,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  accountItemSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  accountIconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  accountDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountName: {
    ...typography.title,
    fontSize: 15,
    color: colors.textPrimary,
  },
  accountNameSelected: {
    color: colors.accent,
    fontWeight: '700',
  },
  badge: {
    marginLeft: spacing.xs,
  },
  accountType: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  accountBalanceContainer: {
    alignItems: 'flex-end',
  },
  accountBalance: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  accountBalanceSelected: {
    color: colors.accent,
  },
  checkIcon: {
    marginTop: 2,
  },
  createButton: {
    marginTop: spacing.xs,
  },
});
