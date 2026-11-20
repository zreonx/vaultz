import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useTheme } from "@/context/ThemeContext";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { Header } from "@/components/shared/Header";
import { StackHeader } from "@/components/shared/StackHeader";
import { Card } from "@/components/ui/Card";
import { AccountAllocationsCard } from "@/components/shared/AccountAllocationsCard";
import { radius, spacing, typography } from "@/theme/tokens";
import { haptics } from "@/utils/haptics";

interface MonthlyFinanceScreenProps {
  navigation: any;
  route?: { name?: string };
}

export const MonthlyFinanceScreen: React.FC<MonthlyFinanceScreenProps> = ({
  route,
}) => {
  const { activeWorkspace, refetchAll } = useWorkspace();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const currency =
    activeWorkspace?.currency || activeWorkspace?.currencyCode || "USD";

  const isTabScreen = route?.name === "Finance";

  useFocusEffect(
    useCallback(() => {
      setRefreshTrigger((n) => n + 1);
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    haptics.light();
    await refetchAll();
    setRefreshTrigger((n) => n + 1);
    setRefreshing(false);
  };

  return (
    <ScreenWrapper>
      {isTabScreen ? (
        <Header />
      ) : (
        <StackHeader
          title="Monthly Finance"
          subtitle={
            activeWorkspace
              ? `${activeWorkspace.name} • ${currency}`
              : undefined
          }
        />
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
        {!activeWorkspace ? (
          <Card
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Ionicons name="wallet-outline" size={34} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No Active Account Selected
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Select or create a financial account first to manage purpose
              vaults and monthly budgets.
            </Text>
          </Card>
        ) : (
          <AccountAllocationsCard
            accountId={activeWorkspace.id}
            accountName={activeWorkspace.name}
            currencyCode={currency}
            refreshTrigger={refreshTrigger}
            onRefreshParent={refetchAll}
          />
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxl * 2,
  },
  emptyCard: {
    alignItems: "center",
    padding: spacing.xxl,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyTitle: {
    ...typography.bodyLarge,
    fontWeight: "600",
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.caption,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
});
