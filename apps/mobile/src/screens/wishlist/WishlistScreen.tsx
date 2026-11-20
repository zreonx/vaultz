import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import { wishlistApi } from "@/api/wishlist";
import { categoriesApi } from "@/api/categories";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useTheme } from "@/context/ThemeContext";
import {
  CategoryResponse,
  CategoryType,
  WishlistItemResponse,
  WishlistPriority,
  WishlistStatus,
} from "@/types/api";
import {
  SUPPORTED_CURRENCIES,
  SupportedCurrencyCode,
  formatMoney,
} from "@/utils/currency";
import { radius, spacing, typography } from "@/theme/tokens";
import { haptics } from "@/utils/haptics";

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getPriorityVariant(priority: WishlistPriority) {
  switch (priority) {
    case WishlistPriority.High:
      return "danger" as const;
    case WishlistPriority.Medium:
      return "warning" as const;
    default:
      return "default" as const;
  }
}

export const WishlistScreen: React.FC = () => {
  const { user } = useAuth();
  const { accounts, activeWorkspace, hideBalance, refetchAll } = useWorkspace();
  const { colors } = useTheme();

  const [items, setItems] = useState<WishlistItemResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | WishlistStatus>(
    WishlistStatus.Wanted
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create / Edit modal state
  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItemResponse | null>(
    null
  );
  const [name, setName] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [currencyCode, setCurrencyCode] = useState<SupportedCurrencyCode>(
    (activeWorkspace?.currencyCode as SupportedCurrencyCode) ||
      (user?.defaultCurrencyCode as SupportedCurrencyCode) ||
      "USD"
  );
  const [priority, setPriority] = useState<WishlistPriority>(
    WishlistPriority.Medium
  );
  const [status, setStatus] = useState<WishlistStatus>(WishlistStatus.Wanted);
  const [linkActiveAccount, setLinkActiveAccount] = useState(
    Boolean(activeWorkspace)
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [targetDate, setTargetDate] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Purchase modal state
  const [purchasingItem, setPurchasingItem] =
    useState<WishlistItemResponse | null>(null);
  const [logExpense, setLogExpense] = useState(true);
  const [purchaseAccountId, setPurchaseAccountId] = useState("");
  const [actualAmount, setActualAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(getTodayIso());

  const loadData = useCallback(async () => {
    try {
      const [wishList, catList] = await Promise.all([
        wishlistApi.getWishlist(activeWorkspace?.id),
        categoriesApi.getCategories(activeWorkspace?.id),
      ]);
      setItems(wishList);
      setCategories(catList);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to load wishlist items.");
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

  const expenseCategories = useMemo(
    () =>
      categories.filter(
        (c) => !c.isArchived && c.type === CategoryType.Expense
      ),
    [categories]
  );

  const filteredItems = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((i) => i.status === statusFilter);
  }, [items, statusFilter]);

  const summary = useMemo(() => {
    const wanted = items.filter((i) => i.status === WishlistStatus.Wanted);
    const purchased = items.filter(
      (i) => i.status === WishlistStatus.Purchased
    );
    const baseCurr =
      activeWorkspace?.currencyCode ||
      user?.defaultCurrencyCode ||
      wanted[0]?.currencyCode ||
      "USD";
    const matchingWanted = wanted.filter(
      (i) => i.currencyCode.toUpperCase() === baseCurr.toUpperCase()
    );
    const totalEstimated = matchingWanted.reduce(
      (acc, i) => acc + i.estimatedPrice,
      0
    );
    return {
      wantedCount: wanted.length,
      purchasedCount: purchased.length,
      baseCurr,
      totalEstimated,
      hasMixedCurrencies: matchingWanted.length !== wanted.length,
    };
  }, [items, activeWorkspace?.currencyCode, user?.defaultCurrencyCode]);

  const openCreateModal = () => {
    setEditingItem(null);
    setName("");
    setEstimatedPrice("");
    setCurrencyCode(
      ((activeWorkspace?.currencyCode ||
        user?.defaultCurrencyCode ||
        "USD") as SupportedCurrencyCode)
    );
    setPriority(WishlistPriority.Medium);
    setStatus(WishlistStatus.Wanted);
    setLinkActiveAccount(Boolean(activeWorkspace));
    setSelectedCategoryId(null);
    setTargetDate("");
    setUrl("");
    setNotes("");
    setFormVisible(true);
  };

  const openEditModal = (item: WishlistItemResponse) => {
    haptics.light();
    setEditingItem(item);
    setName(item.name);
    setEstimatedPrice(String(item.estimatedPrice));
    setCurrencyCode(
      (item.currencyCode.toUpperCase() as SupportedCurrencyCode) || "USD"
    );
    setPriority(item.priority);
    setStatus(item.status);
    setLinkActiveAccount(Boolean(item.accountId));
    setSelectedCategoryId(item.categoryId || null);
    setTargetDate(item.targetDate ? item.targetDate.slice(0, 10) : "");
    setUrl(item.url || "");
    setNotes(item.notes || "");
    setFormVisible(true);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const priceNum = parseFloat(estimatedPrice);
    if (!trimmedName) {
      Alert.alert("Missing Name", "Please enter an item name.");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      Alert.alert("Invalid Price", "Estimated price must be greater than zero.");
      return;
    }
    if (targetDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate.trim())) {
      Alert.alert("Invalid Date", "Target date must be in YYYY-MM-DD format.");
      return;
    }
    if (
      url.trim() &&
      !/^https?:\/\/.+/i.test(url.trim())
    ) {
      Alert.alert("Invalid URL", "URL must start with http:// or https://.");
      return;
    }

    const linkedAcctId =
      linkActiveAccount && activeWorkspace
        ? activeWorkspace.id
        : linkActiveAccount && editingItem?.accountId
        ? editingItem.accountId
        : null;

    const effectiveCurrency =
      linkActiveAccount && activeWorkspace
        ? activeWorkspace.currencyCode
        : currencyCode;

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await wishlistApi.updateItem(editingItem.id, {
          name: trimmedName,
          estimatedPrice: priceNum,
          currencyCode: effectiveCurrency,
          priority,
          status,
          accountId: linkedAcctId,
          categoryId: selectedCategoryId,
          targetDate: targetDate.trim() || null,
          url: url.trim() || null,
          notes: notes.trim() || null,
        });
      } else {
        await wishlistApi.createItem({
          name: trimmedName,
          estimatedPrice: priceNum,
          currencyCode: effectiveCurrency,
          priority,
          accountId: linkedAcctId,
          categoryId: selectedCategoryId,
          targetDate: targetDate.trim() || null,
          url: url.trim() || null,
          notes: notes.trim() || null,
        });
      }
      haptics.success();
      setFormVisible(false);
      await loadData();
    } catch (err: any) {
      Alert.alert("Save Failed", err?.message || "Unable to save item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPurchaseModal = (item: WishlistItemResponse) => {
    haptics.light();
    const defaultAcct =
      accounts.find((a) => a.id === item.accountId) ||
      activeWorkspace ||
      accounts[0];
    setPurchasingItem(item);
    setLogExpense(Boolean(defaultAcct));
    setPurchaseAccountId(defaultAcct?.id || "");
    setActualAmount(
      defaultAcct &&
        defaultAcct.currencyCode.toUpperCase() ===
          item.currencyCode.toUpperCase()
        ? String(item.estimatedPrice)
        : ""
    );
    setOccurredOn(getTodayIso());
  };

  const handleConfirmPurchase = async () => {
    if (!purchasingItem) return;
    if (logExpense) {
      if (!purchaseAccountId) {
        Alert.alert("Account Required", "Please choose an account.");
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn.trim())) {
        Alert.alert("Invalid Date", "Use YYYY-MM-DD format for purchase date.");
        return;
      }
      const acct = accounts.find((a) => a.id === purchaseAccountId);
      const parsed = actualAmount.trim() ? parseFloat(actualAmount) : null;
      if (
        acct &&
        acct.currencyCode.toUpperCase() !==
          purchasingItem.currencyCode.toUpperCase() &&
        (!parsed || !Number.isFinite(parsed) || parsed <= 0)
      ) {
        Alert.alert(
          "Actual Amount Required",
          `Enter the actual paid amount in ${acct.currencyCode}.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const parsed = actualAmount.trim() ? parseFloat(actualAmount) : null;
      await wishlistApi.purchaseItem(purchasingItem.id, {
        logExpense,
        accountId: logExpense ? purchaseAccountId : null,
        categoryId: logExpense ? purchasingItem.categoryId || null : null,
        occurredOn: logExpense ? occurredOn.trim() : null,
        actualAmount: logExpense ? parsed : null,
      });
      haptics.success();
      setPurchasingItem(null);
      await Promise.all([loadData(), refetchAll()]);
    } catch (err: any) {
      Alert.alert(
        "Purchase Failed",
        err?.message || "Could not mark wishlist item purchased."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (item: WishlistItemResponse) => {
    Alert.alert(
      "Remove Item",
      `Delete "${item.name}" from your wishlist?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await wishlistApi.deleteItem(item.id);
              haptics.success();
              await loadData();
            } catch (err: any) {
              Alert.alert("Delete Failed", err?.message || "Unable to delete item.");
            }
          },
        },
      ]
    );
  };

  const fmt = (val: number, code: string) =>
    hideBalance ? "••••••" : formatMoney(val, code);

  const selectedPurchaseAcct = accounts.find((a) => a.id === purchaseAccountId);

  return (
    <ScreenWrapper>
      <StackHeader
        title="Wishlist"
        subtitle={activeWorkspace ? activeWorkspace.name : "All Accounts"}
        rightAction={
          <TouchableOpacity
            onPress={() => {
              haptics.light();
              openCreateModal();
            }}
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
            accessibilityLabel="Add wishlist item"
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
          {/* Summary Card */}
          <Card variant="subtle" style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={[styles.summaryKicker, { color: colors.textMuted }]}>
                  WANTED ITEMS
                </Text>
                <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
                  {summary.wantedCount} Wanted · {summary.purchasedCount} Bought
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={[
                    styles.summaryTotal,
                    { color: colors.accent, fontVariant: ["tabular-nums"] },
                  ]}
                >
                  {fmt(summary.totalEstimated, summary.baseCurr)}
                </Text>
                <Text style={[styles.summarySub, { color: colors.textMuted }]}>
                  {summary.hasMixedCurrencies
                    ? `Est. (${summary.baseCurr} only)`
                    : `Estimated (${summary.baseCurr})`}
                </Text>
              </View>
            </View>
          </Card>

          {/* Status Filter Chips */}
          <View style={styles.filterRow}>
            {(
              [
                { key: WishlistStatus.Wanted, label: "Wanted" },
                { key: WishlistStatus.Purchased, label: "Purchased" },
                { key: WishlistStatus.Archived, label: "Archived" },
                { key: "all", label: "All" },
              ] as const
            ).map((f) => {
              const active = statusFilter === f.key;
              return (
                <TouchableOpacity
                  key={String(f.key)}
                  onPress={() => {
                    haptics.light();
                    setStatusFilter(f.key);
                  }}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? colors.accent : colors.surface,
                      borderColor: active ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: active
                          ? colors.accentForeground
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isLoading && items.length === 0 ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : filteredItems.length === 0 ? (
            <Card style={styles.emptyCard}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="heart-outline" size={26} color={colors.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Wishlist Items Here
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Track upcoming purchases cleanly and convert them into expense entries when bought.
              </Text>
              <Button
                title="Add Wishlist Item"
                onPress={openCreateModal}
                style={{ marginTop: spacing.sm }}
              />
            </Card>
          ) : (
            filteredItems.map((item) => (
              <Card key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: colors.textPrimary }]}>
                      {item.name}
                    </Text>
                    <View style={styles.badgeRow}>
                      <Badge
                        label={item.priorityName}
                        variant={getPriorityVariant(item.priority)}
                      />
                      {item.status !== WishlistStatus.Wanted ? (
                        <Badge
                          label={item.statusName}
                          variant={
                            item.status === WishlistStatus.Purchased
                              ? "success"
                              : "default"
                          }
                        />
                      ) : null}
                      <Badge
                        label={item.accountName || "General"}
                        variant="outline"
                      />
                      {item.categoryName ? (
                        <Badge label={item.categoryName} variant="default" />
                      ) : null}
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.itemPrice,
                      { color: colors.accent, fontVariant: ["tabular-nums"] },
                    ]}
                  >
                    {fmt(item.estimatedPrice, item.currencyCode)}
                  </Text>
                </View>

                {item.targetDate ? (
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    Target Date: {item.targetDate.slice(0, 10)}
                  </Text>
                ) : null}

                {item.notes ? (
                  <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                    {item.notes}
                  </Text>
                ) : null}

                <View style={styles.itemFooter}>
                  {item.status !== WishlistStatus.Purchased ? (
                    <Button
                      title="Mark Purchased"
                      size="sm"
                      variant="primary"
                      onPress={() => openPurchaseModal(item)}
                      style={{ flex: 1, minHeight: 40 }}
                    />
                  ) : (
                    <View style={styles.purchasedPill}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={colors.accent}
                      />
                      <Text style={[styles.purchasedText, { color: colors.accent }]}>
                        Purchased
                        {item.purchasedTransactionId ? " · Expense Logged" : ""}
                      </Text>
                    </View>
                  )}

                  {item.url ? (
                    <TouchableOpacity
                      onPress={() => void Linking.openURL(item.url!)}
                      style={[
                        styles.iconActionBtn,
                        {
                          backgroundColor: colors.surfaceMuted,
                          borderColor: colors.borderSubtle,
                        },
                      ]}
                      accessibilityLabel={`Open link for ${item.name}`}
                    >
                      <Ionicons
                        name="open-outline"
                        size={17}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    onPress={() => openEditModal(item)}
                    style={[
                      styles.iconActionBtn,
                      {
                        backgroundColor: colors.surfaceMuted,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                    accessibilityLabel={`Edit ${item.name}`}
                  >
                    <Ionicons
                      name="create-outline"
                      size={17}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => confirmDelete(item)}
                    style={[
                      styles.iconActionBtn,
                      {
                        backgroundColor: colors.surfaceMuted,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                    accessibilityLabel={`Delete ${item.name}`}
                  >
                    <Ionicons name="trash-outline" size={17} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* Create / Edit Modal */}
      <ModalSheet
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        title={editingItem ? "Edit Wishlist Item" : "New Wishlist Item"}
        subtitle="Plan future purchases cleanly"
        maxHeightRatio={0.92}
        footer={
          <Button
            title={editingItem ? "Save Changes" : "Add to Wishlist"}
            onPress={handleSave}
            isLoading={isSubmitting}
          />
        }
      >
        <View style={styles.modalBody}>
          <Input
            label="Item Name"
            placeholder="e.g., Ergonomic Chair, Camera Lens"
            value={name}
            onChangeText={setName}
            containerStyle={{ marginBottom: 0 }}
          />
          <Input
            label="Estimated Price"
            placeholder="0.00"
            keyboardType="decimal-pad"
            currencyCode={
              linkActiveAccount && activeWorkspace
                ? activeWorkspace.currencyCode
                : currencyCode
            }
            value={estimatedPrice}
            onChangeText={setEstimatedPrice}
            containerStyle={{ marginBottom: 0 }}
          />

          <View>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Priority
            </Text>
            <View style={styles.chipsWrap}>
              {(
                [
                  { value: WishlistPriority.High, label: "High" },
                  { value: WishlistPriority.Medium, label: "Medium" },
                  { value: WishlistPriority.Low, label: "Low" },
                ] as const
              ).map((p) => {
                const selected = priority === p.value;
                return (
                  <TouchableOpacity
                    key={p.value}
                    onPress={() => {
                      haptics.light();
                      setPriority(p.value);
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
                        {
                          color: selected
                            ? colors.accentForeground
                            : colors.textPrimary,
                        },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {editingItem ? (
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Status
              </Text>
              <View style={styles.chipsWrap}>
                {(
                  [
                    { value: WishlistStatus.Wanted, label: "Wanted" },
                    { value: WishlistStatus.Purchased, label: "Purchased" },
                    { value: WishlistStatus.Archived, label: "Archived" },
                  ] as const
                ).map((s) => {
                  const selected = status === s.value;
                  return (
                    <TouchableOpacity
                      key={s.value}
                      onPress={() => {
                        haptics.light();
                        setStatus(s.value);
                      }}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? colors.accent
                            : colors.surfaceMuted,
                          borderColor: selected ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: selected
                              ? colors.accentForeground
                              : colors.textPrimary,
                          },
                        ]}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          {activeWorkspace ? (
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
                  Link to {activeWorkspace.name}
                </Text>
                <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                  Uses {activeWorkspace.currencyCode} inside this account
                </Text>
              </View>
              <Switch
                value={linkActiveAccount}
                onValueChange={setLinkActiveAccount}
                trackColor={{ false: colors.border, true: colors.accent }}
              />
            </View>
          ) : null}

          {!linkActiveAccount || !activeWorkspace ? (
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Currency
              </Text>
              <View style={styles.chipsWrap}>
                {SUPPORTED_CURRENCIES.map((code) => {
                  const selected = currencyCode === code;
                  return (
                    <TouchableOpacity
                      key={code}
                      onPress={() => {
                        haptics.light();
                        setCurrencyCode(code);
                      }}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? colors.accent
                            : colors.surfaceMuted,
                          borderColor: selected ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: selected
                              ? colors.accentForeground
                              : colors.textPrimary,
                          },
                        ]}
                      >
                        {code}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          {expenseCategories.length > 0 ? (
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
                        selectedCategoryId === null
                          ? colors.accent
                          : colors.surfaceMuted,
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
                    None
                  </Text>
                </TouchableOpacity>
                {expenseCategories.map((cat) => {
                  const selected = selectedCategoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedCategoryId(cat.id)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? colors.accent
                            : colors.surfaceMuted,
                          borderColor: selected ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: selected
                              ? colors.accentForeground
                              : colors.textPrimary,
                          },
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

          <Input
            label="Target Date (Optional, YYYY-MM-DD)"
            placeholder="e.g., 2026-12-25"
            value={targetDate}
            onChangeText={setTargetDate}
            autoCapitalize="none"
            containerStyle={{ marginBottom: 0 }}
          />
          <Input
            label="Store Link (Optional)"
            placeholder="https://example.com/item"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            containerStyle={{ marginBottom: 0 }}
          />
          <Input
            label="Notes (Optional)"
            placeholder="Model or gift notes"
            value={notes}
            onChangeText={setNotes}
            multiline
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
      </ModalSheet>

      {/* Mark Purchased Modal */}
      <ModalSheet
        visible={Boolean(purchasingItem)}
        onClose={() => setPurchasingItem(null)}
        title="Mark as Purchased"
        subtitle={
          purchasingItem
            ? `${purchasingItem.name} · Est. ${formatMoney(
                purchasingItem.estimatedPrice,
                purchasingItem.currencyCode
              )}`
            : undefined
        }
        maxHeightRatio={0.88}
        footer={
          <Button
            title="Confirm Purchase"
            onPress={handleConfirmPurchase}
            isLoading={isSubmitting}
          />
        }
      >
        {purchasingItem ? (
          <View style={styles.modalBody}>
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
                  Log Expense Transaction
                </Text>
                <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                  Automatically deducts from account balance
                </Text>
              </View>
              <Switch
                value={logExpense}
                disabled={accounts.length === 0}
                onValueChange={setLogExpense}
                trackColor={{ false: colors.border, true: colors.accent }}
              />
            </View>

            {logExpense ? (
              <>
                <View>
                  <Text
                    style={[styles.fieldLabel, { color: colors.textSecondary }]}
                  >
                    Account
                  </Text>
                  <View style={styles.chipsWrap}>
                    {accounts.map((acct) => {
                      const selected = purchaseAccountId === acct.id;
                      return (
                        <TouchableOpacity
                          key={acct.id}
                          onPress={() => {
                            haptics.light();
                            setPurchaseAccountId(acct.id);
                            if (
                              acct.currencyCode.toUpperCase() ===
                              purchasingItem.currencyCode.toUpperCase()
                            ) {
                              setActualAmount(
                                String(purchasingItem.estimatedPrice)
                              );
                            } else {
                              setActualAmount("");
                            }
                          }}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: selected
                                ? colors.accent
                                : colors.surfaceMuted,
                              borderColor: selected
                                ? colors.accent
                                : colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              {
                                color: selected
                                  ? colors.accentForeground
                                  : colors.textPrimary,
                              },
                            ]}
                          >
                            {acct.name} ({acct.currencyCode})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <Input
                  label="Actual Paid Amount"
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  currencyCode={
                    selectedPurchaseAcct?.currencyCode ||
                    purchasingItem.currencyCode
                  }
                  value={actualAmount}
                  onChangeText={setActualAmount}
                  containerStyle={{ marginBottom: 0 }}
                />

                <Input
                  label="Purchase Date (YYYY-MM-DD)"
                  placeholder={getTodayIso()}
                  value={occurredOn}
                  onChangeText={setOccurredOn}
                  autoCapitalize="none"
                  containerStyle={{ marginBottom: 0 }}
                />
              </>
            ) : null}
          </View>
        ) : null}
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
  summaryCard: {
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  summaryKicker: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  summaryTitle: {
    ...typography.label,
    marginTop: 2,
  },
  summaryTotal: {
    ...typography.title,
    fontWeight: "700",
  },
  summarySub: {
    ...typography.caption,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.base,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: "center",
  },
  filterChipText: {
    ...typography.caption,
    fontWeight: "600",
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
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  itemName: {
    ...typography.bodyLarge,
    fontWeight: "700",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  itemPrice: {
    ...typography.title,
    fontWeight: "700",
  },
  metaText: {
    ...typography.caption,
  },
  notesText: {
    ...typography.body,
    fontSize: 13,
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  purchasedPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  purchasedText: {
    ...typography.caption,
    fontWeight: "600",
  },
  iconActionBtn: {
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
