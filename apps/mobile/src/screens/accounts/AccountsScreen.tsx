import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspace } from '@/context/WorkspaceContext';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CreateAccountModal } from '@/components/shared/CreateAccountModal';
import { colors } from '@/theme/colors';
import { typography, radius, spacing } from '@/theme/tokens';
import { formatMoney } from '@/utils/currency';
import { haptics } from '@/utils/haptics';
import { AccountDto } from '@/types/api';

export const AccountsScreen: React.FC = () => {
  const { accounts, activeWorkspace, setActiveWorkspace, hideBalance, refreshAccounts, isLoading } =
    useWorkspace();
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    haptics.light();
    await refreshAccounts();
    setRefreshing(false);
  };

  const handleSelectAccount = (account: AccountDto) => {
    haptics.selection();
    setActiveWorkspace(account);
  };

  const getAccountIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('credit')) return 'card-outline';
    if (t.includes('savings')) return 'shield-outline';
    if (t.includes('cash')) return 'cash-outline';
    if (t.includes('invest')) return 'trending-up-outline';
    return 'wallet-outline';
  };

  return (
    <ScreenWrapper>
      <Header showAccountPicker={false} title="Accounts" />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introContainer}>
          <Text style={styles.introTitle}>Personal Financial Containers</Text>
          <Text style={styles.introSubtitle}>
            Each account is isolated. Tap any account to set it as your active workspace.
          </Text>
        </View>

        <View style={styles.accountsList}>
          {accounts.map((acc) => {
            const isActive = activeWorkspace?.id === acc.id;

            return (
              <TouchableOpacity
                key={acc.id}
                onPress={() => handleSelectAccount(acc)}
                activeOpacity={0.7}
              >
                <Card
                  style={isActive ? [styles.accountCard, styles.accountCardActive] : styles.accountCard}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardLeft}>
                      <View
                        style={[
                          styles.iconBadge,
                          isActive && styles.iconBadgeActive,
                        ]}
                      >
                        <Ionicons
                          name={getAccountIcon(acc.typeName || String(acc.type))}
                          size={20}
                          color={isActive ? colors.accent : colors.textSecondary}
                        />
                      </View>
                      <View>
                        <View style={styles.nameRow}>
                          <Text
                            style={[
                              styles.accountName,
                              isActive && styles.accountNameActive,
                            ]}
                          >
                            {acc.name}
                          </Text>
                          {acc.isDefault && (
                            <Badge label="Default" variant="outline" style={styles.badge} />
                          )}
                        </View>
                        <Text style={styles.accountType}>
                          {acc.typeName || String(acc.type)} • {acc.currency || acc.currencyCode}
                        </Text>
                      </View>
                    </View>

                    {isActive && (
                      <Badge label="Active Workspace" variant="success" />
                    )}
                  </View>

                  <View style={styles.balanceDivider} />

                  <View style={styles.cardFooter}>
                    <Text style={styles.balanceLabel}>Current Balance</Text>
                    <Text
                      style={[
                        styles.balanceValue,
                        isActive && styles.balanceValueActive,
                      ]}
                    >
                      {hideBalance ? '••••••' : formatMoney(acc.currentBalance ?? acc.balance ?? 0, acc.currency || acc.currencyCode)}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          title="Create New Account"
          variant="secondary"
          leftIcon="add-outline"
          onPress={() => {
            haptics.light();
            setCreateModalVisible(true);
          }}
          style={styles.createButton}
        />
      </ScrollView>

      <CreateAccountModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  introContainer: {
    marginBottom: spacing.lg,
  },
  introTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  introSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  accountsList: {
    marginBottom: spacing.lg,
  },
  accountCard: {
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountCardActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeActive: {
    backgroundColor: colors.accentMuted,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountName: {
    ...typography.title,
    fontSize: 16,
    color: colors.textPrimary,
  },
  accountNameActive: {
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
  },
  balanceDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  balanceValue: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  balanceValueActive: {
    color: colors.accent,
  },
  createButton: {
    marginTop: spacing.xs,
  },
});
