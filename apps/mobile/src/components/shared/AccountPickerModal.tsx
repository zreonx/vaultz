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
import { useTheme } from '@/context/ThemeContext';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PressableScale } from '@/components/ui/PressableScale';
import { EditAccountModal } from '@/components/shared/EditAccountModal';
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
  const { colors, isDark } = useTheme();
  const [editingAccount, setEditingAccount] = useState<AccountDto | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const handleSelectAccount = (account: AccountDto) => {
    haptics.selection();
    setActiveWorkspace(account);
    onClose();
  };

  const handleOpenEdit = (account: AccountDto) => {
    haptics.light();
    setEditingAccount(account);
    setEditModalVisible(true);
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
              <PressableScale
                key={acc.id}
                style={[
                  styles.accountItem,
                  {
                    backgroundColor: isSelected
                      ? colors.accentSoft
                      : isDark
                      ? colors.surfaceSubtle
                      : colors.surfaceMuted,
                    borderColor: isSelected ? colors.accent : colors.borderSubtle,
                  },
                ]}
                onPress={() => handleSelectAccount(acc)}
              >
                <View
                  style={[
                    styles.accountIconContainer,
                    {
                      backgroundColor: isSelected
                        ? colors.accentMuted
                        : colors.surface,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      (acc.typeName || String(acc.type)).toLowerCase().includes('credit')
                        ? 'card-outline'
                        : 'wallet-outline'
                    }
                    size={20}
                    color={isSelected ? colors.accent : colors.textSecondary}
                  />
                </View>

                <View style={styles.accountDetails}>
                  <View style={styles.nameRow}>
                    <Text
                      style={[
                        styles.accountName,
                        { color: isSelected ? colors.accent : colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {acc.name}
                    </Text>
                    {acc.isDefault && (
                      <Badge label="Default" variant="outline" style={styles.badge} />
                    )}
                  </View>
                  <Text style={[styles.accountType, { color: colors.textMuted }]}>
                    {acc.typeName || String(acc.type)} • {acc.currency || acc.currencyCode}
                  </Text>
                </View>

                <View style={styles.accountBalanceContainer}>
                  <Text
                    style={[
                      styles.accountBalance,
                      { color: isSelected ? colors.accent : colors.textPrimary },
                    ]}
                  >
                    {hideBalance
                      ? '••••••'
                      : formatMoney(
                          acc.currentBalance ?? acc.balance ?? 0,
                          acc.currency || acc.currencyCode
                        )}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={colors.accent}
                      style={styles.checkIcon}
                    />
                  )}
                  <PressableScale
                    onPress={() => handleOpenEdit(acc)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.pickerEditBtn}
                    accessibilityLabel={`Edit ${acc.name}`}
                  >
                    <Ionicons name="pencil-outline" size={13} color={colors.textMuted} />
                  </PressableScale>
                </View>
              </PressableScale>
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

      <EditAccountModal
        visible={editModalVisible}
        account={editingAccount}
        onClose={() => {
          setEditModalVisible(false);
          setEditingAccount(null);
        }}
      />
    </ModalSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.sm,
  },
  accountList: {
    marginBottom: spacing.base,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  accountIconContainer: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
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
    flexWrap: 'wrap',
    gap: 4,
  },
  accountName: {
    ...typography.title,
    fontSize: 15,
    fontWeight: '600',
  },
  badge: {
    marginLeft: 2,
  },
  accountType: {
    ...typography.caption,
    marginTop: 2,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  accountBalanceContainer: {
    alignItems: 'flex-end',
  },
  accountBalance: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 14,
  },
  checkIcon: {
    marginTop: 2,
  },
  pickerEditBtn: {
    marginTop: 4,
    padding: 2,
  },
  createButton: {
    marginTop: spacing.xs,
  },
});
