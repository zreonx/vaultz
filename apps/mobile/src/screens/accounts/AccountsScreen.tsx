import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useTheme } from '@/context/ThemeContext';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { FadeInView } from '@/components/ui/FadeInView';
import { CreateAccountModal } from '@/components/shared/CreateAccountModal';
import { typography, radius, spacing } from '@/theme/tokens';
import { formatMoney } from '@/utils/currency';
import { haptics } from '@/utils/haptics';
import { AccountDto } from '@/types/api';

export const AccountsScreen: React.FC = () => {
  const { accounts, activeWorkspace, setActiveWorkspace, hideBalance, refreshAccounts } =
    useWorkspace();
  const { colors, isDark } = useTheme();
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
        {/* Minimalist Section Header */}
        <FadeInView delay={40} translateY={10}>
          <View style={styles.introContainer}>
            <View style={styles.introHeaderRow}>
              <Text style={[styles.introTitle, { color: colors.textPrimary }]}>
                Financial Accounts
              </Text>
              <Badge
                label={`${accounts.length} ${accounts.length === 1 ? 'Account' : 'Accounts'}`}
                variant="outline"
              />
            </View>
            <Text style={[styles.introSubtitle, { color: colors.textMuted }]}>
              Each account operates in strict personal isolation. Tap to switch your active workspace.
            </Text>
          </View>
        </FadeInView>

        {/* Accounts List */}
        <View style={styles.accountsList}>
          {accounts.map((acc, index) => {
            const isActive = activeWorkspace?.id === acc.id;

            return (
              <FadeInView key={acc.id} delay={80 + index * 40} translateY={12}>
                <PressableScale
                  onPress={() => handleSelectAccount(acc)}
                  style={styles.cardPressable}
                >
                  <Card
                    style={[
                      styles.accountCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isActive ? colors.accent : colors.border,
                      },
                      isActive && {
                        backgroundColor: isDark ? 'rgba(71, 153, 128, 0.08)' : 'rgba(42, 107, 88, 0.05)',
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardLeft}>
                        <View
                          style={[
                            styles.iconBadge,
                            {
                              backgroundColor: isActive
                                ? colors.accentMuted
                                : isDark
                                ? colors.surfaceSubtle
                                : colors.surfaceMuted,
                            },
                          ]}
                        >
                          <Ionicons
                            name={getAccountIcon(acc.typeName || String(acc.type))}
                            size={20}
                            color={isActive ? colors.accent : colors.textSecondary}
                          />
                        </View>
                        <View style={styles.accountTextGroup}>
                          <View style={styles.nameRow}>
                            <Text
                              style={[
                                styles.accountName,
                                { color: isActive ? colors.accent : colors.textPrimary },
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
                      </View>

                      {isActive && (
                        <Badge label="Active" variant="success" />
                      )}
                    </View>

                    <View style={[styles.balanceDivider, { backgroundColor: colors.borderSubtle }]} />

                    <View style={styles.cardFooter}>
                      <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>
                        CURRENT BALANCE
                      </Text>
                      <Text
                        style={[
                          styles.balanceValue,
                          { color: isActive ? colors.accent : colors.textPrimary },
                        ]}
                      >
                        {hideBalance
                          ? '••••••'
                          : formatMoney(
                              acc.currentBalance ?? acc.balance ?? 0,
                              acc.currency || acc.currencyCode
                            )}
                      </Text>
                    </View>
                  </Card>
                </PressableScale>
              </FadeInView>
            );
          })}
        </View>

        <FadeInView delay={120 + accounts.length * 40} translateY={12}>
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
        </FadeInView>
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
    padding: spacing.base,
    paddingBottom: spacing.xxl * 2,
  },
  introContainer: {
    marginBottom: spacing.base,
  },
  introHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  introTitle: {
    ...typography.title,
    fontSize: 19,
    fontWeight: '700',
  },
  introSubtitle: {
    ...typography.caption,
    lineHeight: 18,
    fontSize: 12,
  },
  accountsList: {
    marginBottom: spacing.base,
  },
  cardPressable: {
    marginBottom: spacing.md,
  },
  accountCard: {
    padding: spacing.base + 2,
    borderRadius: radius.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  accountTextGroup: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  accountName: {
    ...typography.title,
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    marginLeft: 2,
  },
  accountType: {
    ...typography.caption,
    marginTop: 2,
    fontSize: 12,
  },
  balanceDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  balanceLabel: {
    ...typography.caption,
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  balanceValue: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '700',
  },
  createButton: {
    marginTop: spacing.xs,
  },
});
