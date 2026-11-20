import React, { useState, useEffect, useMemo } from "react";
import { Alert, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PressableScale } from "@/components/ui/PressableScale";
import { transactionsApi } from "@/api/transactions";
import { categoriesApi } from "@/api/categories";
import { accountAllocationsApi } from "@/api/accountAllocations";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useOfflineSync } from "@/context/OfflineSyncContext";
import { useTheme } from "@/context/ThemeContext";
import { typography, radius, spacing } from "@/theme/tokens";
import {
  convertReferenceAmount,
  formatMoney,
  getReferenceExchangeRate,
} from "@/utils/currency";
import { haptics } from "@/utils/haptics";
import {
  AccountAllocationsOverviewResponse,
  CategoryResponse,
  CategoryType,
  TransactionDto,
  TransactionType,
} from "@/types/api";

interface CreateTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  defaultType?: "Expense" | "Income" | "Transfer";
  editingTransaction?: TransactionDto | null;
  onSuccess?: () => void;
}

const FALLBACK_LABELS: Record<"Expense" | "Income" | "Transfer", string[]> = {
  Expense: [
    "Food & Dining",
    "Groceries",
    "Transport",
    "Utilities",
    "Shopping",
    "Other",
  ],
  Income: ["Salary", "Freelance", "Investments", "Gift", "Refund", "Other"],
  Transfer: ["Account Transfer", "Savings Allocation", "Debt Payment"],
};

function resolveStringType(t: TransactionType | string | undefined): "Expense" | "Income" | "Transfer" {
  if (t === TransactionType.Income || t === "Income") return "Income";
  if (t === TransactionType.Transfer || t === "Transfer") return "Transfer";
  return "Expense";
}

function getTodayIso(): string {
  return new Date().toISOString().split("T")[0];
}

export const CreateTransactionModal: React.FC<CreateTransactionModalProps> = ({
  visible,
  onClose,
  defaultType = "Expense",
  editingTransaction = null,
  onSuccess,
}) => {
  const { activeWorkspace, accounts, refetchAll } = useWorkspace();
  const { enqueueTransaction } = useOfflineSync();
  const { colors, isDark } = useTheme();

  const isEditing = Boolean(editingTransaction);

  const [type, setType] = useState<"Expense" | "Income" | "Transfer">(defaultType);
  const [amount, setAmount] = useState("");
  const [destinationAmount, setDestinationAmount] = useState("");
  const [destAmountEdited, setDestAmountEdited] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [fallbackLabel, setFallbackLabel] = useState<string>("Other");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [occurredOn, setOccurredOn] = useState(getTodayIso());
  const [destinationAccountId, setDestinationAccountId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allocationsData, setAllocationsData] =
    useState<AccountAllocationsOverviewResponse | null>(null);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [selectedSliceId, setSelectedSliceId] = useState<string>("");

  const activeCurrency =
    activeWorkspace?.currency || activeWorkspace?.currencyCode || "USD";

  // Synchronize form whenever modal opens, defaultType changes, or editingTransaction changes
  useEffect(() => {
    if (!visible) return;
    setError(null);
    setDestAmountEdited(false);

    if (editingTransaction) {
      const txType = resolveStringType(
        editingTransaction.type ?? editingTransaction.typeName
      );
      setType(txType);
      setAmount(String(editingTransaction.amount ?? ""));
      setDestinationAmount(
        editingTransaction.destinationAmount
          ? String(editingTransaction.destinationAmount)
          : ""
      );
      setSelectedCategoryId(editingTransaction.categoryId ?? null);
      setFallbackLabel(
        editingTransaction.categoryName ||
          editingTransaction.category ||
          FALLBACK_LABELS[txType][0]
      );
      setDescription(editingTransaction.description || "");
      setNotes(editingTransaction.notes || "");
      setOccurredOn(
        (editingTransaction.occurredOn ||
          editingTransaction.transactionDate ||
          getTodayIso()
        ).split("T")[0]
      );
      setDestinationAccountId(editingTransaction.destinationAccountId || "");
      setSelectedSliceId(editingTransaction.budgetSliceId || "");
    } else {
      setType(defaultType);
      setAmount("");
      setDestinationAmount("");
      setSelectedCategoryId(null);
      setFallbackLabel(FALLBACK_LABELS[defaultType][0]);
      setDescription("");
      setNotes("");
      setOccurredOn(getTodayIso());
      setDestinationAccountId("");
      setSelectedSliceId("");
    }
  }, [visible, defaultType, editingTransaction, activeWorkspace?.id]);

  // Fetch active budgets & user categories when modal opens
  useEffect(() => {
    if (!visible || !activeWorkspace) return;

    accountAllocationsApi
      .getOverview(activeWorkspace.id)
      .then((data) => setAllocationsData(data))
      .catch(() => null);

    categoriesApi
      .getCategories(activeWorkspace.id)
      .then((list) => setCategories(list || []))
      .catch(() => setCategories([]));
  }, [visible, activeWorkspace]);

  const filteredCategories = useMemo(() => {
    if (type === "Transfer") return [];
    const expectedCatType =
      type === "Income" ? CategoryType.Income : CategoryType.Expense;
    return categories.filter((c) => c.type === expectedCatType && !c.isArchived);
  }, [categories, type]);

  // Auto-select first category if creating and none chosen yet
  useEffect(() => {
    if (!visible || isEditing || type === "Transfer") return;
    if (
      filteredCategories.length > 0 &&
      !filteredCategories.some((c) => c.id === selectedCategoryId)
    ) {
      setSelectedCategoryId(filteredCategories[0].id);
      setFallbackLabel(filteredCategories[0].name);
    }
  }, [visible, isEditing, type, filteredCategories, selectedCategoryId]);

  const otherAccounts = useMemo(
    () => accounts.filter((a) => a.id !== activeWorkspace?.id),
    [accounts, activeWorkspace?.id]
  );

  const selectedDestAccount = useMemo(
    () => accounts.find((a) => a.id === destinationAccountId) ?? null,
    [accounts, destinationAccountId]
  );

  const destCurrency =
    selectedDestAccount?.currency || selectedDestAccount?.currencyCode || activeCurrency;
  const isCrossCurrencyTransfer =
    type === "Transfer" &&
    Boolean(selectedDestAccount) &&
    destCurrency.toUpperCase() !== activeCurrency.toUpperCase();

  const referenceRate = useMemo(
    () =>
      isCrossCurrencyTransfer
        ? getReferenceExchangeRate(activeCurrency, destCurrency)
        : 1,
    [isCrossCurrencyTransfer, activeCurrency, destCurrency]
  );

  // Auto-compute destination amount for cross-currency transfer when user has not overridden it
  useEffect(() => {
    if (!isCrossCurrencyTransfer || destAmountEdited) return;
    const amtNum = parseFloat(amount);
    if (!isNaN(amtNum) && amtNum > 0) {
      setDestinationAmount(
        String(convertReferenceAmount(amtNum, activeCurrency, destCurrency))
      );
    } else {
      setDestinationAmount("");
    }
  }, [amount, isCrossCurrencyTransfer, destAmountEdited, activeCurrency, destCurrency]);

  const handleTypeChange = (newType: "Expense" | "Income" | "Transfer") => {
    haptics.selection();
    setType(newType);
    setSelectedCategoryId(null);
    setFallbackLabel(FALLBACK_LABELS[newType][0]);
    if (newType !== "Expense") setSelectedSliceId("");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!activeWorkspace) {
      setError("No active account selected");
      haptics.error();
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive amount");
      haptics.error();
      return;
    }

    if (type === "Transfer" && !destinationAccountId) {
      setError("Please select a destination account for the transfer");
      haptics.error();
      return;
    }

    let parsedDestAmount: number | null = null;
    if (isCrossCurrencyTransfer) {
      parsedDestAmount = parseFloat(destinationAmount);
      if (isNaN(parsedDestAmount) || parsedDestAmount <= 0) {
        setError(`Enter the received amount in ${destCurrency}`);
        haptics.error();
        return;
      }
    }

    const selectedCategoryObj = filteredCategories.find(
      (c) => c.id === selectedCategoryId
    );
    const resolvedCategoryName = selectedCategoryObj?.name || fallbackLabel;
    const effectiveDescription =
      description.trim() || resolvedCategoryName || type;

    try {
      setIsLoading(true);
      setError(null);

      if (isEditing && editingTransaction) {
        await transactionsApi.updateTransaction(editingTransaction.id, {
          accountId: editingTransaction.accountId || activeWorkspace.id,
          destinationAccountId:
            type === "Transfer" ? destinationAccountId : null,
          categoryId: type === "Transfer" ? null : selectedCategoryId,
          type,
          amount: parsedAmount,
          occurredOn: occurredOn.trim() || getTodayIso(),
          description: effectiveDescription,
          notes: notes.trim() || null,
        });
        await refetchAll();
      } else {
        await enqueueTransaction({
          accountId: activeWorkspace.id,
          accountName: activeWorkspace.name,
          currency: activeCurrency,
          type,
          amount: parsedAmount,
          category: resolvedCategoryName,
          categoryId: type === "Transfer" ? null : selectedCategoryId,
          description: effectiveDescription,
          transactionDate: new Date().toISOString(),
          destinationAccountId:
            type === "Transfer" ? destinationAccountId : undefined,
          destinationAccountName: selectedDestAccount?.name,
          destinationAmount: parsedDestAmount,
          budgetSliceId:
            type === "Expense" && selectedSliceId ? selectedSliceId : undefined,
        });
      }

      haptics.success();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      haptics.error();
      setError(err?.message || "Failed to save transaction");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTransaction = () => {
    if (!editingTransaction) return;

    Alert.alert(
      "Delete Transaction",
      `Delete "${editingTransaction.description || editingTransaction.category || "transaction"}" for ${formatMoney(editingTransaction.amount, editingTransaction.currency || activeCurrency)}? Account balance will be automatically reconciled.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              await transactionsApi.deleteTransaction(editingTransaction.id);
              haptics.success();
              await refetchAll();
              onClose();
              if (onSuccess) onSuccess();
            } catch (err: any) {
              haptics.error();
              setError(err?.message || "Failed to delete transaction");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const activeSlices = allocationsData?.activeBudgetPlan?.slices ?? [];
  const selectedSlice = activeSlices.find((s) => s.id === selectedSliceId);
  const exceedsSlice =
    !isEditing &&
    Boolean(selectedSlice) &&
    (parseFloat(amount) || 0) > (selectedSlice?.remainingAmount ?? 0);

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={isEditing ? "Edit Transaction" : "Record Transaction"}
      subtitle={
        isEditing
          ? `${activeWorkspace?.name || "Account"} • Update or remove entry`
          : `Adding to ${activeWorkspace?.name || "Active Account"}`
      }
      maxHeightRatio={0.92}
      footer={
        <View>
          <View style={styles.buttonRow}>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={onClose}
              style={styles.cancelBtn}
              disabled={isLoading}
            />
            <Button
              title={isEditing ? "Save Changes" : `Save ${type}`}
              variant="primary"
              onPress={handleSubmit}
              isLoading={isLoading}
              style={styles.submitBtn}
            />
          </View>

          {isEditing && (
            <View style={styles.deleteWrapper}>
              <Button
                title="Delete Transaction"
                variant="ghost"
                leftIcon="trash-outline"
                onPress={handleDeleteTransaction}
                disabled={isLoading}
                textStyle={{ color: colors.danger, fontWeight: "600" }}
              />
            </View>
          )}
        </View>
      }
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
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {error}
            </Text>
          </View>
        )}

        {/* Segmented Control for Type */}
        <View
          style={[
            styles.segmentedControl,
            {
              backgroundColor: isDark
                ? colors.surfaceSubtle
                : colors.surfaceMuted,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          {(["Expense", "Income", "Transfer"] as const).map((t) => {
            const isActive = type === t;
            return (
              <PressableScale
                key={t}
                style={[
                  styles.segmentBtn,
                  isActive && [
                    styles.segmentBtnActive,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderSubtle,
                    },
                  ],
                ]}
                onPress={() => handleTypeChange(t)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: isActive
                        ? t === "Expense"
                          ? colors.danger
                          : t === "Income"
                          ? colors.accent
                          : isDark
                          ? "#60A5FA"
                          : "#2563EB"
                        : colors.textMuted,
                      fontWeight: isActive ? "700" : "500",
                    },
                  ]}
                >
                  {t}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        {/* Amount Input */}
        <Input
          label="Amount"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={(val) => {
            setAmount(val);
            if (error) setError(null);
          }}
          currencyCode={activeCurrency}
          autoFocus={false}
        />

        {/* Destination Account Selection for Transfer */}
        {type === "Transfer" && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              TRANSFER TO ACCOUNT
            </Text>
            {otherAccounts.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No other accounts available. Create another account first.
              </Text>
            ) : (
              <View style={styles.chipRow}>
                {otherAccounts.map((acc) => {
                  const isSelected = destinationAccountId === acc.id;
                  const accCurr = acc.currency || acc.currencyCode;
                  return (
                    <PressableScale
                      key={acc.id}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected
                            ? colors.accentMuted
                            : isDark
                            ? colors.surfaceSubtle
                            : colors.surfaceMuted,
                          borderColor: isSelected ? colors.accent : colors.borderSubtle,
                        },
                      ]}
                      onPress={() => {
                        haptics.selection();
                        setDestinationAccountId(acc.id);
                        setDestAmountEdited(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected
                              ? colors.accent
                              : colors.textSecondary,
                            fontWeight: isSelected ? "700" : "500",
                          },
                        ]}
                      >
                        {acc.name} ({accCurr})
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            )}

            {isCrossCurrencyTransfer && (
              <View
                style={[
                  styles.fxBox,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSubtle
                      : colors.surfaceMuted,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Text style={[styles.fxRateText, { color: colors.textSecondary }]}>
                  Benchmark Rate: 1 {activeCurrency} ≈ {referenceRate} {destCurrency}
                </Text>
                <Input
                  label={`Destination Amount (${destCurrency})`}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  currencyCode={destCurrency}
                  value={destinationAmount}
                  onChangeText={(v) => {
                    setDestAmountEdited(true);
                    setDestinationAmount(v);
                  }}
                />
              </View>
            )}
          </View>
        )}

        {/* Monthly Budget Slice Selector (on new Expense) */}
        {!isEditing &&
          type === "Expense" &&
          activeSlices.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  MONTHLY BUDGET SLICE
                </Text>
                <Badge label="Optional" variant="outline" />
              </View>

              <View style={styles.chipRow}>
                <PressableScale
                  style={[
                    styles.chip,
                    {
                      backgroundColor: !selectedSliceId
                        ? colors.accentMuted
                        : isDark
                        ? colors.surfaceSubtle
                        : colors.surfaceMuted,
                      borderColor: !selectedSliceId
                        ? colors.accent
                        : colors.borderSubtle,
                    },
                  ]}
                  onPress={() => {
                    haptics.selection();
                    setSelectedSliceId("");
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: !selectedSliceId
                          ? colors.accent
                          : colors.textSecondary,
                        fontWeight: !selectedSliceId ? "700" : "500",
                      },
                    ]}
                  >
                    General Balance
                  </Text>
                </PressableScale>

                {activeSlices.map((slice) => {
                  const isSelected = selectedSliceId === slice.id;
                  return (
                    <PressableScale
                      key={slice.id}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected
                            ? colors.accentMuted
                            : isDark
                            ? colors.surfaceSubtle
                            : colors.surfaceMuted,
                          borderColor: isSelected
                            ? colors.accent
                            : colors.borderSubtle,
                        },
                      ]}
                      onPress={() => {
                        haptics.selection();
                        setSelectedSliceId(slice.id);
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected
                              ? colors.accent
                              : colors.textSecondary,
                            fontWeight: isSelected ? "700" : "500",
                          },
                        ]}
                      >
                        {slice.name} (
                        {formatMoney(slice.remainingAmount, activeCurrency)})
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>

              {exceedsSlice && selectedSlice && (
                <View style={styles.sliceWarnRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={15}
                    color={colors.danger}
                  />
                  <Text style={[styles.sliceWarnText, { color: colors.danger }]}>
                    Amount exceeds remaining slice budget (
                    {formatMoney(selectedSlice.remainingAmount, activeCurrency)}{" "}
                    left).
                  </Text>
                </View>
              )}
            </View>
          )}

        {/* Category Selector */}
        {type !== "Transfer" && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              CATEGORY
            </Text>
            <View style={styles.chipRow}>
              {filteredCategories.length > 0
                ? filteredCategories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <PressableScale
                        key={cat.id}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected
                              ? colors.accentMuted
                              : isDark
                              ? colors.surfaceSubtle
                              : colors.surfaceMuted,
                            borderColor: isSelected
                              ? colors.accent
                              : colors.borderSubtle,
                          },
                        ]}
                        onPress={() => {
                          haptics.selection();
                          setSelectedCategoryId(cat.id);
                          setFallbackLabel(cat.name);
                        }}
                      >
                        <View style={styles.catChipInner}>
                          <View
                            style={[
                              styles.catDot,
                              { backgroundColor: cat.colorHex || colors.accent },
                            ]}
                          />
                          <Text
                            style={[
                              styles.chipText,
                              {
                                color: isSelected
                                  ? colors.accent
                                  : colors.textSecondary,
                                fontWeight: isSelected ? "700" : "500",
                              },
                            ]}
                          >
                            {cat.name}
                          </Text>
                        </View>
                      </PressableScale>
                    );
                  })
                : FALLBACK_LABELS[type].map((catName) => {
                    const isSelected = fallbackLabel === catName;
                    return (
                      <PressableScale
                        key={catName}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected
                              ? colors.accentMuted
                              : isDark
                              ? colors.surfaceSubtle
                              : colors.surfaceMuted,
                            borderColor: isSelected
                              ? colors.accent
                              : colors.borderSubtle,
                          },
                        ]}
                        onPress={() => {
                          haptics.selection();
                          setSelectedCategoryId(null);
                          setFallbackLabel(catName);
                        }}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: isSelected
                                ? colors.accent
                                : colors.textSecondary,
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}
                        >
                          {catName}
                        </Text>
                      </PressableScale>
                    );
                  })}
            </View>
          </View>
        )}

        {/* Date Input in Edit mode */}
        {isEditing && (
          <Input
            label="Date (YYYY-MM-DD)"
            placeholder="2026-11-19"
            value={occurredOn}
            onChangeText={setOccurredOn}
            leftIcon="calendar-outline"
          />
        )}

        {/* Description / Note Inputs */}
        <Input
          label="Description (Optional)"
          placeholder="e.g. Morning coffee, Grocery haul"
          value={description}
          onChangeText={setDescription}
          leftIcon="reader-outline"
        />

        {isEditing && (
          <Input
            label="Notes (Optional)"
            placeholder="Extra details..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />
        )}
      </View>
    </ModalSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.sm,
  },
  errorBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    textAlign: "center",
    fontWeight: "600",
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: radius.lg,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.base,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: radius.md,
  },
  segmentBtnActive: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmentText: {
    ...typography.caption,
    fontSize: 12,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionLabel: {
    ...typography.label,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  catChipInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    ...typography.caption,
    fontSize: 12,
  },
  fxBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  fxRateText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "600",
  },
  sliceWarnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  sliceWarnText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  emptyText: {
    ...typography.caption,
    fontStyle: "italic",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 2,
  },
  deleteWrapper: {
    marginTop: spacing.md,
    alignItems: "center",
  },
});
