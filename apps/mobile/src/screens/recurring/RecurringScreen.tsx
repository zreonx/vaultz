import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { StackHeader } from "@/components/shared/StackHeader";
import { recurringApi } from "@/api/recurring";
import { categoriesApi } from "@/api/categories";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useTheme } from "@/context/ThemeContext";
import {
  CategoryResponse,
  CategoryType,
  RecurrenceFrequency,
  RecurringTransactionResponse,
  TransactionType,
} from "@/types/api";
import { formatMoney } from "@/utils/currency";
import { radius, spacing, typography } from "@/theme/tokens";
import { haptics } from "@/utils/haptics";

function getTodayLocalIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const RecurringScreen: React.FC = () => {
  const { accounts, activeWorkspace, hideBalance, refetchAll } = useWorkspace();
  const { colors } = useTheme();

  const [items, setItems] = useState<RecurringTransactionResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Create / Edit modal state
  const [createVisible, setCreateVisible] = useState(false);
  const [editingItem, setEditingItem] =
    useState<RecurringTransactionResponse | null>(null);
  const [txType, setTxType] = useState<TransactionType>(TransactionType.Expense);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [destinationAccountId, setDestinationAccountId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    RecurrenceFrequency.Monthly
  );
  const [nextDate, setNextDate] = useState(getTodayLocalIso());
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayIso = useMemo(() => getTodayLocalIso(), []);

  const loadData = useCallback(async () => {
    try {
      const [recList, catList] = await Promise.all([
        recurringApi.getRecurring(activeWorkspace?.id),
        categoriesApi.getCategories(activeWorkspace?.id),
      ]);
      setItems(recList);
      setCategories(catList);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to load recurring schedules.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeWorkspace?.id]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadData();
    }, [loadData])
  );

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) || activeWorkspace || accounts[0],
    [accounts, selectedAccountId, activeWorkspace]
  );

  const filteredCategories = useMemo(() => {
    if (txType === TransactionType.Transfer) return [];
    const targetType =
      txType === TransactionType.Income ? CategoryType.Income : CategoryType.Expense;
    return categories.filter((c) => !c.isArchived && c.type === targetType);
  }, [categories, txType]);

  const destinationAccounts = useMemo(
    () =>
      accounts.filter(
        (a) =>
          a.id !== selectedAccount?.id &&
          a.currencyCode === selectedAccount?.currencyCode
      ),
    [accounts, selectedAccount?.id, selectedAccount?.currencyCode]
  );

  const openCreateModal = () => {
    if (accounts.length === 0) {
      Alert.alert("No Accounts", "Create a financial account first.");
      return;
    }
    const defaultAcct = activeWorkspace || accounts[0];
    const firstDest = accounts.find(
      (a) => a.id !== defaultAcct.id && a.currencyCode === defaultAcct.currencyCode
    );
    setEditingItem(null);
    setTxType(TransactionType.Expense);
    setSelectedAccountId(defaultAcct.id);
    setDestinationAccountId(firstDest?.id || "");
    setSelectedCategoryId(null);
    setAmount("");
    setDescription("");
    setFrequency(RecurrenceFrequency.Monthly);
    setNextDate(getTodayLocalIso());
    setIsActive(true);
    setCreateVisible(true);
  };

  const openEditModal = (item: RecurringTransactionResponse) => {
    haptics.light();
    setEditingItem(item);
    setTxType(item.type);
    setSelectedAccountId(item.accountId);
    setDestinationAccountId(item.destinationAccountId || "");
    setSelectedCategoryId(item.categoryId || null);
    setAmount(String(item.amount));
    setDescription(item.description);
    setFrequency(item.frequency);
    setNextDate(item.nextOccurrenceDate.slice(0, 10));
    setIsActive(item.isActive);
    setCreateVisible(true);
  };

  const handleSave = async () => {
    if (!selectedAccount) {
      Alert.alert("Account Required", "Please select a source account.");
      return;
    }
    const amtNum = parseFloat(amount);
    if (!Number.isFinite(amtNum) || amtNum <= 0) {
      Alert.alert("Invalid Amount", "Please enter an amount greater than zero.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Missing Description", "Please describe this recurring item.");
      return;
    }
    if (txType === TransactionType.Transfer && !destinationAccountId) {
      Alert.alert("Destination Required", "Please select a destination account.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate.trim())) {
      Alert.alert("Invalid Date", "Please enter next occurrence date as YYYY-MM-DD.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        accountId: selectedAccount.id,
        destinationAccountId:
          txType === TransactionType.Transfer ? destinationAccountId : null,
        categoryId:
          txType !== TransactionType.Transfer ? selectedCategoryId : null,
        type: txType,
        amount: amtNum,
        description: description.trim(),
        frequency,
        nextOccurrenceDate: nextDate.trim(),
      };

      if (editingItem) {
        await recurringApi.updateRecurring(editingItem.id, {
          ...payload,
          isActive,
        });
      } else {
        await recurringApi.createRecurring(payload);
      }

      haptics.success();
      setCreateVisible(false);
      await loadData();
    } catch (err: any) {
      Alert.alert(
        editingItem ? "Update Failed" : "Create Failed",
        err?.message || "Unable to save recurring item."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogNow = async (item: RecurringTransactionResponse) => {
    haptics.light();
    setProcessingId(item.id);
    try {
      await recurringApi.processOccurrence(item.id);
      haptics.success();
      await Promise.all([loadData(), refetchAll()]);
      Alert.alert(
        "Logged",
        `Recorded "${item.description}" and advanced the next schedule date.`
      );
    } catch (err: any) {
      Alert.alert("Process Failed", err?.message || "Could not log occurrence.");
    } finally {
      setProcessingId(null);
    }
  };

  const confirmDelete = (item: RecurringTransactionResponse) => {
    Alert.alert(
      "Delete Schedule",
      `Remove recurring rule "${item.description}"? Existing transactions remain untouched.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await recurringApi.deleteRecurring(item.id);
              haptics.success();
              await loadData();
            } catch (err: any) {
              Alert.alert("Delete Failed", err?.message || "Unable to delete schedule.");
            }
          },
        },
      ]
    );
  };

  const fmt = (val: number, code: string) =>
    hideBalance ? "••••••" : formatMoney(val, code);

  return (
    <ScreenWrapper>
      <StackHeader
        title="Recurring Schedules"
        subtitle={activeWorkspace ? activeWorkspace.name : "All Accounts"}
        rightAction={
          <TouchableOpacity
            onPress={() => {
              haptics.light();
              openCreateModal();
            }}
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
            accessibilityLabel="Add recurring schedule"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={20} color={colors.accentForeground} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              void loadData();
            }}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.container}>
        {isLoading && items.length === 0 ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : items.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="repeat-outline" size={28} color={colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No Recurring Schedules
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Save subscriptions, rent, payroll, or recurring transfers and log them in one tap when due.
            </Text>
            <Button
              title="Add Recurring Rule"
              onPress={openCreateModal}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        ) : (
          items.map((item) => {
            const dueKey = item.nextOccurrenceDate.slice(0, 10);
            const isOverdue = dueKey < todayIso;
            const isDueToday = dueKey === todayIso;
            const isIncome = item.type === TransactionType.Income;
            const isTransfer = item.type === TransactionType.Transfer;

            const iconName: keyof typeof Ionicons.glyphMap = isIncome
              ? "arrow-down"
              : isTransfer
              ? "swap-horizontal"
              : "arrow-up";

            const amountColor = isIncome
              ? colors.accent
              : isTransfer
              ? colors.textPrimary
              : colors.danger;

            return (
              <Card key={item.id} style={styles.itemCard}>
                <View style={styles.itemTop}>
                  <View
                    style={[
                      styles.typeCircle,
                      {
                        backgroundColor: isIncome
                          ? colors.accentSoft
                          : isTransfer
                          ? colors.surfaceMuted
                          : colors.dangerSoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name={iconName}
                      size={18}
                      color={
                        isIncome
                          ? colors.accent
                          : isTransfer
                          ? colors.textSecondary
                          : colors.danger
                      }
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemDesc, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.description}
                    </Text>
                    <Text style={[styles.itemAcct, { color: colors.textMuted }]} numberOfLines={1}>
                      {isTransfer && item.destinationAccountName
                        ? `${item.accountName} -> ${item.destinationAccountName}`
                        : item.accountName}
                      {item.categoryName ? ` · ${item.categoryName}` : ""}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.itemAmount,
                      { color: amountColor, fontVariant: ["tabular-nums"] },
                    ]}
                  >
                    {isIncome ? "+" : isTransfer ? "" : "-"}
                    {fmt(item.amount, item.currencyCode)}
                  </Text>
                </View>

                <View style={styles.badgeRow}>
                  <Badge label={item.frequencyName} variant="outline" />
                  <Badge
                    label={
                      isOverdue
                        ? `Overdue (${dueKey})`
                        : isDueToday
                        ? `Due Today`
                        : `Next: ${dueKey}`
                    }
                    variant={isOverdue ? "danger" : isDueToday ? "warning" : "default"}
                  />
                  {!item.isActive ? (
                    <Badge label="Paused" variant="warning" />
                  ) : null}
                </View>

                <View style={styles.itemActions}>
                  <Button
                    title={item.isActive ? "Log Now" : "Paused"}
                    size="sm"
                    variant={
                      !item.isActive
                        ? "secondary"
                        : isOverdue || isDueToday
                        ? "primary"
                        : "secondary"
                    }
                    disabled={!item.isActive}
                    isLoading={processingId === item.id}
                    onPress={() => handleLogNow(item)}
                    style={{ flex: 1, minHeight: 40 }}
                  />
                  <TouchableOpacity
                    onPress={() => openEditModal(item)}
                    style={[
                      styles.trashBtn,
                      { backgroundColor: colors.surfaceMuted, borderColor: colors.borderSubtle },
                    ]}
                    accessibilityLabel={`Edit ${item.description}`}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => confirmDelete(item)}
                    style={[
                      styles.trashBtn,
                      { backgroundColor: colors.surfaceMuted, borderColor: colors.borderSubtle },
                    ]}
                    accessibilityLabel={`Delete ${item.description}`}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
        </View>
      </ScrollView>

      {/* Create / Edit Recurring Modal */}
      <ModalSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        title={editingItem ? "Edit Recurring Rule" : "New Recurring Rule"}
        subtitle="Set up or modify a repeating income, expense, or transfer"
        maxHeightRatio={0.92}
        footer={
          <Button
            title={editingItem ? "Save Changes" : "Save Schedule"}
            onPress={handleSave}
            isLoading={isSubmitting}
          />
        }
      >
        <View style={styles.modalBody}>
          {/* Type Tabs */}
          <View
            style={[
              styles.typeSwitch,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
            ]}
          >
            {(
              [
                { type: TransactionType.Expense, label: "Expense" },
                { type: TransactionType.Income, label: "Income" },
                { type: TransactionType.Transfer, label: "Transfer" },
              ] as const
            ).map((opt) => {
              const active = txType === opt.type;
              return (
                <TouchableOpacity
                  key={opt.type}
                  onPress={() => {
                    haptics.light();
                    setTxType(opt.type);
                    setSelectedCategoryId(null);
                  }}
                  style={[
                    styles.typeBtn,
                    active && { backgroundColor: colors.surface },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      { color: active ? colors.textPrimary : colors.textMuted },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label="Description"
            placeholder="e.g., Monthly Rent, Salary, Netflix"
            value={description}
            onChangeText={setDescription}
            containerStyle={{ marginBottom: 0 }}
          />

          <Input
            label="Amount"
            placeholder="0.00"
            keyboardType="decimal-pad"
            currencyCode={selectedAccount?.currencyCode || "USD"}
            value={amount}
            onChangeText={setAmount}
            containerStyle={{ marginBottom: 0 }}
          />

          {/* Account Picker */}
          <View>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              {txType === TransactionType.Transfer ? "From Account" : "Account"}
            </Text>
            <View style={styles.chipsWrap}>
              {accounts.map((acct) => {
                const selected = selectedAccount?.id === acct.id;
                return (
                  <TouchableOpacity
                    key={acct.id}
                    onPress={() => {
                      haptics.light();
                      setSelectedAccountId(acct.id);
                      if (destinationAccountId === acct.id) {
                        const other = accounts.find((a) => a.id !== acct.id);
                        setDestinationAccountId(other?.id || "");
                      }
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? colors.accent : colors.surfaceMuted,
                        borderColor: selected ? colors.accent : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? colors.accentForeground : colors.textPrimary },
                      ]}
                    >
                      {acct.name} ({acct.currencyCode})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Destination Account Picker (Transfers) */}
          {txType === TransactionType.Transfer ? (
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                To Account
              </Text>
              {destinationAccounts.length === 0 ? (
                <Text style={[styles.helperMuted, { color: colors.danger }]}>
                  You need at least two accounts for recurring transfers.
                </Text>
              ) : (
                <View style={styles.chipsWrap}>
                  {destinationAccounts.map((acct) => {
                    const selected = destinationAccountId === acct.id;
                    return (
                      <TouchableOpacity
                        key={acct.id}
                        onPress={() => {
                          haptics.light();
                          setDestinationAccountId(acct.id);
                        }}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected ? colors.accent : colors.surfaceMuted,
                            borderColor: selected ? colors.accent : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: selected ? colors.accentForeground : colors.textPrimary },
                          ]}
                        >
                          {acct.name} ({acct.currencyCode})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}

          {/* Category Picker */}
          {txType !== TransactionType.Transfer && filteredCategories.length > 0 ? (
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Category (Optional)
              </Text>
              <View style={styles.chipsWrap}>
                <TouchableOpacity
                  onPress={() => setSelectedCategoryId(null)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        selectedCategoryId === null ? colors.accent : colors.surfaceMuted,
                      borderColor:
                        selectedCategoryId === null ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color:
                          selectedCategoryId === null
                            ? colors.accentForeground
                            : colors.textPrimary,
                      },
                    ]}
                  >
                    Uncategorized
                  </Text>
                </TouchableOpacity>
                {filteredCategories.map((cat) => {
                  const selected = selectedCategoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => {
                        haptics.light();
                        setSelectedCategoryId(cat.id);
                      }}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? colors.accent : colors.surfaceMuted,
                          borderColor: selected ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: selected ? colors.accentForeground : colors.textPrimary },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Frequency Selector */}
          <View>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Frequency
            </Text>
            <View style={styles.chipsWrap}>
              {(
                [
                  { value: RecurrenceFrequency.Daily, label: "Daily" },
                  { value: RecurrenceFrequency.Weekly, label: "Weekly" },
                  { value: RecurrenceFrequency.Monthly, label: "Monthly" },
                  { value: RecurrenceFrequency.Yearly, label: "Yearly" },
                ] as const
              ).map((f) => {
                const selected = frequency === f.value;
                return (
                  <TouchableOpacity
                    key={f.value}
                    onPress={() => {
                      haptics.light();
                      setFrequency(f.value);
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? colors.accent : colors.surfaceMuted,
                        borderColor: selected ? colors.accent : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? colors.accentForeground : colors.textPrimary },
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Input
            label="Next Occurrence Date (YYYY-MM-DD)"
            placeholder="2026-11-20"
            value={nextDate}
            onChangeText={setNextDate}
            autoCapitalize="none"
            containerStyle={{ marginBottom: 0 }}
          />

          {editingItem ? (
            <View
              style={[
                styles.switchRow,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>
                  Schedule Active
                </Text>
                <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                  Pause to keep the schedule without logging entries
                </Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: colors.border, true: colors.accent }}
              />
            </View>
          ) : null}
        </View>
      </ModalSheet>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.huge,
  },
  container: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  centerBox: {
    paddingVertical: spacing.huge,
    alignItems: "center",
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    ...typography.title,
  },
  emptySubtitle: {
    ...typography.body,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
  itemCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  typeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  itemDesc: {
    ...typography.bodyLarge,
    fontWeight: "600",
  },
  itemAcct: {
    ...typography.caption,
    marginTop: 2,
  },
  itemAmount: {
    ...typography.bodyLarge,
    fontWeight: "700",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  trashBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    gap: spacing.md,
  },
  typeSwitch: {
    flexDirection: "row",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 3,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  typeBtnText: {
    ...typography.caption,
    fontWeight: "600",
  },
  fieldLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  chipText: {
    ...typography.caption,
    fontWeight: "600",
  },
  helperMuted: {
    ...typography.caption,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  switchLabel: {
    ...typography.label,
  },
  switchSub: {
    ...typography.caption,
    marginTop: 2,
  },
});
