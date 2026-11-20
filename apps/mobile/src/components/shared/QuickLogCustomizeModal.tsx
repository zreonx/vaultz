import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import {
  getStarterQuickLogPresets,
  quickLogPresetsApi,
} from '@/api/quickLogPresets';
import { secureStore } from '@/security/secureStore';
import { useTheme } from '@/context/ThemeContext';
import { typography, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import {
  MonthlyBudgetSliceDto,
  QuickLogPresetDto,
  QuickLogPresetItemInput,
  TransactionType,
} from '@/types/api';

const ICON_OPTIONS: { id: string; label: string; ion: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'coffee', label: 'Coffee', ion: 'cafe-outline' },
  { id: 'utensils', label: 'Dining', ion: 'restaurant-outline' },
  { id: 'car', label: 'Transit', ion: 'car-outline' },
  { id: 'shopping-bag', label: 'Shop', ion: 'bag-outline' },
  { id: 'zap', label: 'Quick', ion: 'flash-outline' },
  { id: 'home', label: 'Home', ion: 'home-outline' },
  { id: 'heart', label: 'Care', ion: 'heart-outline' },
];

const COLORS = ['#2A6B58', '#B87D28', '#2563EB', '#D97706', '#8B5CF6', '#DC2626'];

interface EditablePreset {
  localId: string;
  label: string;
  amount: string;
  type: TransactionType;
  categoryId?: string | null;
  budgetSliceId: string;
  icon: string;
  colorHex: string;
}

interface QuickLogCustomizeModalProps {
  visible: boolean;
  onClose: () => void;
  accountId: string;
  accountName: string;
  currencyCode: string;
  savedPresets: QuickLogPresetDto[];
  activeSlices: MonthlyBudgetSliceDto[];
  onSaved: (updated: QuickLogPresetDto[]) => void;
}

export const QuickLogCustomizeModal: React.FC<QuickLogCustomizeModalProps> = ({
  visible,
  onClose,
  accountId,
  accountName,
  currencyCode,
  savedPresets,
  activeSlices,
  onSaved,
}) => {
  const { colors, isDark } = useTheme();
  const [rows, setRows] = useState<EditablePreset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError(null);

    if (savedPresets.length > 0) {
      setRows(
        savedPresets.slice(0, 6).map((p) => ({
          localId: p.id,
          label: p.label,
          amount: String(p.amount),
          type: p.type,
          categoryId: p.categoryId ?? null,
          budgetSliceId:
            p.budgetSliceId && activeSlices.some((s) => s.id === p.budgetSliceId)
              ? p.budgetSliceId
              : 'none',
          icon: p.icon || 'zap',
          colorHex: p.colorHex || '#2A6B58',
        }))
      );
    } else {
      const starters = getStarterQuickLogPresets(currencyCode);
      setRows(
        starters.map((s) => ({
          localId: s.key,
          label: s.label,
          amount: String(s.amount),
          type: s.type,
          categoryId: null,
          budgetSliceId: 'none',
          icon: s.icon,
          colorHex: s.colorHex,
        }))
      );
    }
  }, [visible, savedPresets, currencyCode, activeSlices]);

  const updateRow = (localId: string, patch: Partial<EditablePreset>) => {
    setRows((prev) => prev.map((r) => (r.localId === localId ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    if (rows.length >= 6) return;
    haptics.selection();
    setRows((prev) => [
      ...prev,
      {
        localId: `new_${Date.now()}_${prev.length}`,
        label: '',
        amount: '',
        type: TransactionType.Expense,
        categoryId: null,
        budgetSliceId: 'none',
        icon: 'zap',
        colorHex: COLORS[prev.length % COLORS.length],
      },
    ]);
  };

  const removeRow = (localId: string) => {
    haptics.light();
    setRows((prev) => prev.filter((r) => r.localId !== localId));
  };

  const handleSave = async () => {
    setError(null);

    const payload: QuickLogPresetItemInput[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const trimmed = r.label.trim();
      const numAmount = parseFloat(r.amount);

      if (!trimmed) {
        setError(`Shortcut #${i + 1} needs a label.`);
        haptics.error();
        return;
      }
      if (isNaN(numAmount) || numAmount <= 0) {
        setError(`Shortcut "${trimmed}" needs a positive amount.`);
        haptics.error();
        return;
      }

      payload.push({
        label: trimmed,
        amount: numAmount,
        type: r.type,
        categoryId: r.categoryId ?? null,
        budgetSliceId:
          r.type === TransactionType.Expense &&
          r.budgetSliceId !== 'none' &&
          activeSlices.some((s) => s.id === r.budgetSliceId)
            ? r.budgetSliceId
            : null,
        icon: r.icon || 'zap',
        colorHex: r.colorHex || '#2A6B58',
        sortOrder: i,
      });
    }

    try {
      setSaving(true);
      const updated = await quickLogPresetsApi.replaceForAccount(accountId, payload);
      await secureStore.setItemAsync(
        `vaultz_quick_log_presets_${accountId}`,
        JSON.stringify(updated)
      );
      haptics.success();
      onSaved(updated);
      onClose();
    } catch (err: any) {
      haptics.error();
      setError(err.message || 'Could not save quick-log presets.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Customize Quick Log"
      subtitle={`${accountName} • Up to 6 shortcuts (${currencyCode})`}
      maxHeightRatio={0.92}
      footer={
        <View style={{ gap: spacing.sm }}>
          {rows.length < 6 && (
            <Button
              title={`Add Shortcut (${rows.length}/6)`}
              variant="secondary"
              leftIcon="add-outline"
              onPress={addRow}
              disabled={saving}
            />
          )}

          <View style={styles.footerRow}>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={onClose}
              disabled={saving}
              style={styles.cancelBtn}
            />
            <Button
              title="Save Shortcuts"
              variant="primary"
              onPress={handleSave}
              isLoading={saving}
              style={styles.saveBtn}
            />
          </View>
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
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        {rows.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
              {
                backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No custom shortcuts yet. Saving empty restores starter presets, or tap Add Shortcut below.
            </Text>
          </View>
        ) : (
          rows.map((row, idx) => (
            <View
              key={row.localId}
              style={[
                styles.rowCard,
                {
                  backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <View style={styles.rowHeader}>
                <Text style={[styles.rowTitle, { color: colors.textSecondary }]}>
                  SHORTCUT #{idx + 1}
                </Text>
                <TouchableOpacity
                  onPress={() => removeRow(row.localId)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={`Remove shortcut ${idx + 1}`}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>

              {/* Expense / Income toggle */}
              <View style={styles.typeToggleRow}>
                {[
                  { val: TransactionType.Expense, label: 'Expense' },
                  { val: TransactionType.Income, label: 'Income' },
                ].map((opt) => {
                  const active = row.type === opt.val;
                  return (
                    <PressableScale
                      key={opt.val}
                      onPress={() => {
                        haptics.selection();
                        updateRow(row.localId, {
                          type: opt.val,
                          categoryId: null,
                          budgetSliceId: 'none',
                        });
                      }}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: active ? colors.accentSoft : colors.surface,
                          borderColor: active ? colors.accent : colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          {
                            color: active ? colors.accent : colors.textSecondary,
                            fontWeight: active ? '700' : '500',
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>

              <Input
                label="Label"
                placeholder="e.g., Coffee, Lunch"
                value={row.label}
                maxLength={50}
                onChangeText={(val) => updateRow(row.localId, { label: val })}
              />

              <Input
                label={`Amount (${currencyCode})`}
                placeholder="0.00"
                keyboardType="decimal-pad"
                currencyCode={currencyCode}
                value={row.amount}
                onChangeText={(val) => updateRow(row.localId, { amount: val })}
              />

              {/* Icon Selector */}
              <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
                ICON
              </Text>
              <View style={styles.chipWrap}>
                {ICON_OPTIONS.map((opt) => {
                  const selected = row.icon === opt.id;
                  return (
                    <PressableScale
                      key={opt.id}
                      onPress={() => {
                        haptics.selection();
                        updateRow(row.localId, { icon: opt.id });
                      }}
                      style={[
                        styles.iconChip,
                        {
                          backgroundColor: selected ? colors.accentSoft : colors.surface,
                          borderColor: selected ? colors.accent : colors.borderSubtle,
                        },
                      ]}
                    >
                      <Ionicons
                        name={opt.ion}
                        size={15}
                        color={selected ? colors.accent : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.iconChipText,
                          { color: selected ? colors.accent : colors.textSecondary },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>

              {/* Optional Monthly Finance Slice assignment */}
              {row.type === TransactionType.Expense && activeSlices.length > 0 && (
                <>
                  <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
                    DEDUCT FROM MONTHLY BUDGET (OPTIONAL)
                  </Text>
                  <View style={styles.chipWrap}>
                    <PressableScale
                      onPress={() => {
                        haptics.selection();
                        updateRow(row.localId, { budgetSliceId: 'none' });
                      }}
                      style={[
                        styles.iconChip,
                        {
                          backgroundColor:
                            row.budgetSliceId === 'none' ? colors.accentSoft : colors.surface,
                          borderColor:
                            row.budgetSliceId === 'none' ? colors.accent : colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.iconChipText,
                          {
                            color:
                              row.budgetSliceId === 'none'
                                ? colors.accent
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        Unassigned
                      </Text>
                    </PressableScale>
                    {activeSlices.map((s) => {
                      const active = row.budgetSliceId === s.id;
                      return (
                        <PressableScale
                          key={s.id}
                          onPress={() => {
                            haptics.selection();
                            updateRow(row.localId, { budgetSliceId: s.id });
                          }}
                          style={[
                            styles.iconChip,
                            {
                              backgroundColor: active ? colors.accentSoft : colors.surface,
                              borderColor: active ? colors.accent : colors.borderSubtle,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.iconChipText,
                              { color: active ? colors.accent : colors.textSecondary },
                            ]}
                          >
                            {s.name}
                          </Text>
                        </PressableScale>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          ))
        )}
      </View>
    </ModalSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.lg,
  },
  errorBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    fontWeight: '600',
  },
  emptyBox: {
    padding: spacing.base,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.caption,
    textAlign: 'center',
  },
  rowCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  rowTitle: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  typeToggleRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  typeChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipText: {
    ...typography.label,
    fontSize: 12,
  },
  subLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  iconChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconChipText: {
    ...typography.caption,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
  },
  saveBtn: {
    flex: 2,
  },
});
