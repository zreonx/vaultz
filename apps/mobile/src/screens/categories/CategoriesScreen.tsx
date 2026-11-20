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
import { categoriesApi } from "@/api/categories";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useTheme } from "@/context/ThemeContext";
import { CategoryResponse, CategoryType } from "@/types/api";
import { radius, spacing, typography } from "@/theme/tokens";
import { haptics } from "@/utils/haptics";

const COLOR_PALETTE = [
  "#2A6B58",
  "#3B82F6",
  "#D97706",
  "#8B5CF6",
  "#0EA5E9",
  "#E06C6C",
  "#10B981",
  "#EC4899",
];

export const CategoriesScreen: React.FC = () => {
  const { activeWorkspace } = useWorkspace();
  const { colors } = useTheme();

  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [filterType, setFilterType] = useState<CategoryType>(CategoryType.Expense);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal state (shared Create / Edit)
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<CategoryResponse | null>(null);
  const [name, setName] = useState("");
  const [formType, setFormType] = useState<CategoryType>(CategoryType.Expense);
  const [colorHex, setColorHex] = useState(COLOR_PALETTE[0]);
  const [scopeToAccount, setScopeToAccount] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const data = await categoriesApi.getCategories(activeWorkspace?.id);
      setCategories(data);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to load categories.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeWorkspace?.id]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadCategories();
    }, [loadCategories])
  );

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.type === filterType),
    [categories, filterType]
  );

  const openCreateModal = () => {
    setEditing(null);
    setName("");
    setFormType(filterType);
    setColorHex(COLOR_PALETTE[0]);
    setScopeToAccount(Boolean(activeWorkspace));
    setIsArchived(false);
    setModalVisible(true);
  };

  const openEditModal = (cat: CategoryResponse) => {
    haptics.light();
    setEditing(cat);
    setName(cat.name);
    setFormType(cat.type);
    setColorHex(cat.colorHex || COLOR_PALETTE[0]);
    setIsArchived(cat.isArchived);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Missing Name", "Please enter a category name.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editing) {
        await categoriesApi.updateCategory(editing.id, {
          name: trimmed,
          colorHex,
          isArchived,
        });
      } else {
        await categoriesApi.createCategory({
          name: trimmed,
          type: formType,
          colorHex,
          accountId: scopeToAccount && activeWorkspace ? activeWorkspace.id : null,
        });
      }
      haptics.success();
      setModalVisible(false);
      await loadCategories();
    } catch (err: any) {
      Alert.alert("Save Failed", err?.message || "Unable to save category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (cat: CategoryResponse) => {
    Alert.alert(
      "Delete Category",
      `Delete "${cat.name}"? Transactions linked to it will become uncategorized or preserved cleanly.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await categoriesApi.deleteCategory(cat.id);
              haptics.success();
              await loadCategories();
            } catch (err: any) {
              Alert.alert("Delete Failed", err?.message || "Unable to delete category.");
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenWrapper>
      <StackHeader
        title="Categories"
        subtitle={activeWorkspace ? activeWorkspace.name : "Global Categories"}
        showPrivacyToggle={false}
        rightAction={
          <TouchableOpacity
            onPress={() => {
              haptics.light();
              openCreateModal();
            }}
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
            accessibilityLabel="Add category"
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
              void loadCategories();
            }}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.container}>
        {/* Expense / Income Filter Tabs */}
        <View
          style={[
            styles.segment,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              haptics.light();
              setFilterType(CategoryType.Expense);
            }}
            style={[
              styles.segmentBtn,
              filterType === CategoryType.Expense && { backgroundColor: colors.surface },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    filterType === CategoryType.Expense
                      ? colors.textPrimary
                      : colors.textMuted,
                },
              ]}
            >
              Expenses
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              haptics.light();
              setFilterType(CategoryType.Income);
            }}
            style={[
              styles.segmentBtn,
              filterType === CategoryType.Income && { backgroundColor: colors.surface },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    filterType === CategoryType.Income
                      ? colors.textPrimary
                      : colors.textMuted,
                },
              ]}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading && categories.length === 0 ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : visibleCategories.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="pricetags-outline" size={26} color={colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No {filterType === CategoryType.Expense ? "Expense" : "Income"} Categories
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Create custom tags to organize spending and improve cash flow insights.
            </Text>
            <Button
              title="Add Category"
              onPress={openCreateModal}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        ) : (
          <Card style={styles.listCard}>
            {visibleCategories.map((cat, idx) => {
              const isLast = idx === visibleCategories.length - 1;
              return (
                <View
                  key={cat.id}
                  style={[
                    styles.row,
                    !isLast && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.swatchDot,
                      { backgroundColor: cat.colorHex || colors.accent },
                    ]}
                  />
                  <View style={styles.rowInfo}>
                    <Text
                      style={[
                        styles.catName,
                        { color: colors.textPrimary },
                        cat.isArchived && { opacity: 0.55 },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                    <View style={styles.badgesRow}>
                      <Badge
                        label={cat.accountName || "Global"}
                        variant="outline"
                      />
                      {cat.isArchived ? (
                        <Badge label="Archived" variant="warning" />
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      onPress={() => openEditModal(cat)}
                      style={styles.iconBtn}
                      accessibilityLabel={`Edit ${cat.name}`}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => confirmDelete(cat)}
                      style={styles.iconBtn}
                      accessibilityLabel={`Delete ${cat.name}`}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </Card>
        )}
        </View>
      </ScrollView>

      {/* Create / Edit Category Modal */}
      <ModalSheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? "Edit Category" : "New Category"}
        subtitle={
          editing
            ? `Updating ${editing.typeName} category`
            : "Organize transactions and reports cleanly"
        }
        maxHeightRatio={0.85}
        footer={
          <Button
            title={editing ? "Save Changes" : "Create Category"}
            onPress={handleSave}
            isLoading={isSubmitting}
          />
        }
      >
        <View style={styles.modalBody}>
          <Input
            label="Category Name"
            placeholder="e.g., Groceries, Freelance, Utilities"
            value={name}
            onChangeText={setName}
            containerStyle={{ marginBottom: 0 }}
          />

          {!editing ? (
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Type</Text>
              <View
                style={[
                  styles.segment,
                  { backgroundColor: colors.surfaceMuted, borderColor: colors.border, marginBottom: 0 },
                ]}
              >
                <TouchableOpacity
                  onPress={() => setFormType(CategoryType.Expense)}
                  style={[
                    styles.segmentBtn,
                    formType === CategoryType.Expense && { backgroundColor: colors.surface },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color:
                          formType === CategoryType.Expense
                            ? colors.textPrimary
                            : colors.textMuted,
                      },
                    ]}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFormType(CategoryType.Income)}
                  style={[
                    styles.segmentBtn,
                    formType === CategoryType.Income && { backgroundColor: colors.surface },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color:
                          formType === CategoryType.Income
                            ? colors.textPrimary
                            : colors.textMuted,
                      },
                    ]}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Color Tag</Text>
            <View style={styles.paletteRow}>
              {COLOR_PALETTE.map((hex) => {
                const selected = colorHex.toUpperCase() === hex.toUpperCase();
                return (
                  <TouchableOpacity
                    key={hex}
                    onPress={() => {
                      haptics.light();
                      setColorHex(hex);
                    }}
                    style={[
                      styles.paletteCircle,
                      { backgroundColor: hex },
                      selected && {
                        borderWidth: 3,
                        borderColor: colors.textPrimary,
                      },
                    ]}
                    accessibilityLabel={`Select color ${hex}`}
                  />
                );
              })}
            </View>
          </View>

          {!editing && activeWorkspace ? (
            <View
              style={[
                styles.switchRow,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                  Only for {activeWorkspace.name}
                </Text>
                <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                  Turn off to make available across all accounts
                </Text>
              </View>
              <Switch
                value={scopeToAccount}
                onValueChange={setScopeToAccount}
                trackColor={{ false: colors.border, true: colors.accent }}
              />
            </View>
          ) : null}

          {editing ? (
            <View
              style={[
                styles.switchRow,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                  Archive Category
                </Text>
                <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                  Hide from new transaction pickers without losing history
                </Text>
              </View>
              <Switch
                value={isArchived}
                onValueChange={setIsArchived}
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
  segment: {
    flexDirection: "row",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 3,
    marginBottom: spacing.base,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radius.sm,
    minHeight: 38,
    justifyContent: "center",
  },
  segmentText: {
    ...typography.label,
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
  listCard: {
    padding: 0,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    minHeight: 62,
    gap: spacing.md,
  },
  swatchDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  rowInfo: {
    flex: 1,
    gap: 4,
  },
  catName: {
    ...typography.bodyLarge,
    fontWeight: "600",
  },
  badgesRow: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  iconBtn: {
    width: 38,
    height: 38,
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
  paletteRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  paletteCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
  switchTitle: {
    ...typography.label,
  },
  switchSub: {
    ...typography.caption,
    marginTop: 2,
  },
});
