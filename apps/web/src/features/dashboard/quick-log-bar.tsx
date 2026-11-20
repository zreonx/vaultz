"use client";

import { useState } from "react";
import {
  Car,
  Coffee,
  Heart,
  Home,
  Loader2,
  Plus,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Utensils,
  Zap,
} from "lucide-react";
import { formatMoney } from "@/lib/utils/currency";
import { useCategories } from "@/hooks/use-categories";
import { useAccountAllocations } from "@/hooks/use-account-allocations";
import {
  getStarterQuickLogPresets,
  useQuickLogPresets,
  useQuickLogTransactionMutation,
  useReplaceQuickLogPresetsMutation,
} from "@/hooks/use-quick-log-presets";
import {
  CategoryType,
  TransactionType,
  type AccountResponse,
  type QuickLogPresetItemInput,
} from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const QUICK_LOG_ICON_OPTIONS = [
  { id: "coffee", label: "Coffee", Icon: Coffee },
  { id: "utensils", label: "Dining", Icon: Utensils },
  { id: "car", label: "Transit", Icon: Car },
  { id: "shopping-bag", label: "Shop", Icon: ShoppingBag },
  { id: "zap", label: "Quick", Icon: Zap },
  { id: "home", label: "Home", Icon: Home },
  { id: "heart", label: "Care", Icon: Heart },
  { id: "sparkles", label: "Other", Icon: Sparkles },
] as const;

const COLOR_SWATCHES = [
  "#2A6B58",
  "#B87D28",
  "#2563EB",
  "#D97706",
  "#8B5CF6",
  "#DC2626",
];

function renderPresetIcon(iconId: string, colorHex: string) {
  const match = QUICK_LOG_ICON_OPTIONS.find((item) => item.id === iconId);
  const IconComp = match?.Icon ?? Zap;
  return <IconComp className="h-3.5 w-3.5 shrink-0" style={{ color: colorHex }} />;
}

interface EditablePresetRow {
  localId: string;
  label: string;
  amount: string;
  type: TransactionType;
  categoryId: string;
  budgetSliceId: string;
  icon: string;
  colorHex: string;
}

interface QuickLogBarProps {
  account: AccountResponse;
}

export function QuickLogBar({ account }: QuickLogBarProps) {
  const { data: savedPresets = [], isLoading } = useQuickLogPresets(account.id);
  const { data: categories = [] } = useCategories(account.id);
  const { data: allocationsOverview } = useAccountAllocations(account.id);
  const quickLogMutation = useQuickLogTransactionMutation();
  const replacePresetsMutation = useReplaceQuickLogPresetsMutation();

  const [activeLoggingKey, setActiveLoggingKey] = useState<string | null>(null);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [draftRows, setDraftRows] = useState<EditablePresetRow[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const activeSlices = allocationsOverview?.activeBudgetPlan?.slices ?? [];
  const hasSavedPresets = savedPresets.length > 0;
  const starterPresets = getStarterQuickLogPresets(account.currencyCode);

  const displayItems = hasSavedPresets
    ? savedPresets.map((p) => ({
        key: p.id,
        label: p.label,
        amount: p.amount,
        type: p.type,
        categoryId: p.categoryId ?? null,
        budgetSliceId: p.budgetSliceId ?? null,
        icon: p.icon,
        colorHex: p.colorHex,
      }))
    : starterPresets.map((s) => ({
        key: s.key,
        label: s.label,
        amount: s.amount,
        type: s.type,
        categoryId: null as string | null,
        budgetSliceId: null as string | null,
        icon: s.icon,
        colorHex: s.colorHex,
      }));

  const handleOpenCustomize = () => {
    const initialRows: EditablePresetRow[] = (hasSavedPresets
      ? savedPresets.map((p) => ({
          localId: p.id,
          label: p.label,
          amount: String(p.amount),
          type: p.type,
          categoryId: p.categoryId ?? "none",
          budgetSliceId:
            p.budgetSliceId && activeSlices.some((s) => s.id === p.budgetSliceId)
              ? p.budgetSliceId
              : "none",
          icon: p.icon || "zap",
          colorHex: p.colorHex || "#2A6B58",
        }))
      : starterPresets.map((s) => ({
          localId: s.key,
          label: s.label,
          amount: String(s.amount),
          type: s.type,
          categoryId: "none",
          budgetSliceId: "none",
          icon: s.icon,
          colorHex: s.colorHex,
        }))
    ).slice(0, 6);

    setDraftRows(initialRows);
    setFormError(null);
    setIsCustomizeOpen(true);
  };

  const handleQuickLogClick = (item: (typeof displayItems)[number]) => {
    if (quickLogMutation.isPending) return;

    const validCategoryId =
      item.categoryId && categories.some((c) => c.id === item.categoryId)
        ? item.categoryId
        : null;

    const validSliceId =
      item.type === TransactionType.Expense &&
      item.budgetSliceId &&
      activeSlices.some((s) => s.id === item.budgetSliceId)
        ? item.budgetSliceId
        : null;

    setActiveLoggingKey(item.key);
    quickLogMutation.mutate(
      {
        accountId: account.id,
        type: item.type,
        amount: item.amount,
        description: item.label,
        categoryId: validCategoryId,
        budgetSliceId: validSliceId,
      },
      {
        onSettled: () => setActiveLoggingKey(null),
      }
    );
  };

  const handleAddDraftRow = () => {
    if (draftRows.length >= 6) return;
    setDraftRows((prev) => [
      ...prev,
      {
        localId: `new-${Date.now()}-${prev.length}`,
        label: "",
        amount: "",
        type: TransactionType.Expense,
        categoryId: "none",
        budgetSliceId: "none",
        icon: "zap",
        colorHex: COLOR_SWATCHES[prev.length % COLOR_SWATCHES.length] ?? "#2A6B58",
      },
    ]);
  };

  const handleUpdateDraftRow = (
    localId: string,
    patch: Partial<EditablePresetRow>
  ) => {
    setDraftRows((prev) =>
      prev.map((row) => (row.localId === localId ? { ...row, ...patch } : row))
    );
  };

  const handleRemoveDraftRow = (localId: string) => {
    setDraftRows((prev) => prev.filter((row) => row.localId !== localId));
  };

  const handleSavePresets = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload: QuickLogPresetItemInput[] = [];
    for (let i = 0; i < draftRows.length; i++) {
      const row = draftRows[i];
      if (!row) continue;
      const trimmedLabel = row.label.trim();
      const numericAmount = Number(row.amount);

      if (!trimmedLabel) {
        setFormError(`Shortcut #${i + 1} needs a label.`);
        return;
      }
      if (trimmedLabel.length > 50) {
        setFormError(`Shortcut "${trimmedLabel}" cannot exceed 50 characters.`);
        return;
      }
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        setFormError(`Shortcut "${trimmedLabel}" needs an amount greater than zero.`);
        return;
      }

      payload.push({
        label: trimmedLabel,
        amount: numericAmount,
        type: row.type,
        categoryId: row.categoryId !== "none" ? row.categoryId : null,
        budgetSliceId:
          row.type === TransactionType.Expense &&
          row.budgetSliceId !== "none" &&
          activeSlices.some((s) => s.id === row.budgetSliceId)
            ? row.budgetSliceId
            : null,
        icon: row.icon || "zap",
        colorHex: row.colorHex || "#2A6B58",
        sortOrder: i,
      });
    }

    replacePresetsMutation.mutate(
      { accountId: account.id, presets: payload },
      {
        onSuccess: () => setIsCustomizeOpen(false),
      }
    );
  };

  return (
    <>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              1-Tap Quick Log
            </h3>
            {!hasSavedPresets && !isLoading && (
              <Badge variant="neutral" className="text-[10px]">
                Starter Presets
              </Badge>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleOpenCustomize}
            className="gap-1.5 text-xs h-7"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Customize
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-36 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {displayItems.map((item) => {
              const isLoggingThis = activeLoggingKey === item.key && quickLogMutation.isPending;
              const sign = item.type === TransactionType.Income ? "+" : "-";
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={quickLogMutation.isPending}
                  onClick={() => handleQuickLogClick(item)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/30 disabled:opacity-60 cursor-pointer"
                >
                  {isLoggingThis ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
                  ) : (
                    renderPresetIcon(item.icon, item.colorHex)
                  )}
                  <span className="font-semibold">{item.label}</span>
                  <span
                    className={`tabular-nums font-semibold ${
                      item.type === TransactionType.Income
                        ? "text-[var(--accent)]"
                        : "text-[var(--muted-foreground)]"
                    }`}
                  >
                    {sign}
                    {formatMoney(item.amount, account.currencyCode)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={isCustomizeOpen} onOpenChange={setIsCustomizeOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90dvh] flex flex-col p-0 overflow-hidden gap-0">
          <DialogHeader className="px-6 pt-5 pb-3.5 border-b border-[var(--border-subtle)] shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[var(--accent)]" />
              Customize Quick Log ({account.name})
            </DialogTitle>
            <DialogDescription>
              Pin up to 6 routine expenses or income items in {account.currencyCode} for instant 1-tap recording.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSavePresets}
            className="flex flex-col flex-1 min-h-0 overflow-hidden"
          >
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-3">
            {formError && (
              <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3 text-xs text-[var(--danger)]">
                {formError}
              </div>
            )}
              {draftRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--muted-foreground)]">
                  No shortcuts configured. Saving an empty list restores starter presets, or click &ldquo;Add Shortcut&rdquo; below.
                </div>
              ) : (
                draftRows.map((row, idx) => {
                  const compatibleCategories = categories.filter((c) =>
                    row.type === TransactionType.Income
                      ? c.type === CategoryType.Income
                      : c.type === CategoryType.Expense
                  );

                  return (
                    <div
                      key={row.localId}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                          Shortcut #{idx + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDraftRow(row.localId)}
                          className="h-7 px-2 text-xs text-[var(--muted-foreground)] hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-5 space-y-1">
                          <Label className="text-[11px]">Label</Label>
                          <Input
                            value={row.label}
                            onChange={(e) =>
                              handleUpdateDraftRow(row.localId, { label: e.target.value })
                            }
                            placeholder="e.g., Coffee, Lunch"
                            maxLength={50}
                          />
                        </div>

                        <div className="sm:col-span-4 space-y-1">
                          <Label className="text-[11px]">Amount ({account.currencyCode})</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={row.amount}
                            onChange={(e) =>
                              handleUpdateDraftRow(row.localId, { amount: e.target.value })
                            }
                            placeholder="0.00"
                            className="tabular-nums"
                          />
                        </div>

                        <div className="sm:col-span-3 space-y-1">
                          <Label className="text-[11px]">Type</Label>
                          <Select
                            value={String(row.type)}
                            onValueChange={(v) =>
                              handleUpdateDraftRow(row.localId, {
                                type: Number(v) as TransactionType,
                                categoryId: "none",
                                budgetSliceId: "none",
                              })
                            }
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={String(TransactionType.Expense)}>
                                Expense
                              </SelectItem>
                              <SelectItem value={String(TransactionType.Income)}>
                                Income
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-4 space-y-1">
                          <Label className="text-[11px]">Icon</Label>
                          <Select
                            value={row.icon}
                            onValueChange={(v) =>
                              handleUpdateDraftRow(row.localId, { icon: v })
                            }
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {QUICK_LOG_ICON_OPTIONS.map((opt) => (
                                <SelectItem key={opt.id} value={opt.id}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="sm:col-span-4 space-y-1">
                          <Label className="text-[11px]">Category (Optional)</Label>
                          <Select
                            value={row.categoryId}
                            onValueChange={(v) =>
                              handleUpdateDraftRow(row.localId, { categoryId: v })
                            }
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Category</SelectItem>
                              {compatibleCategories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="sm:col-span-4 space-y-1">
                          <Label className="text-[11px]">Monthly Budget (Optional)</Label>
                          <Select
                            value={row.budgetSliceId}
                            disabled={
                              row.type !== TransactionType.Expense ||
                              activeSlices.length === 0
                            }
                            onValueChange={(v) =>
                              handleUpdateDraftRow(row.localId, { budgetSliceId: v })
                            }
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Unassigned</SelectItem>
                              {activeSlices.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddDraftRow}
                disabled={draftRows.length >= 6}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Shortcut ({draftRows.length}/6)
              </Button>
            </div>
            </div>

            <DialogFooter className="px-6 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)]/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCustomizeOpen(false)}
                disabled={replacePresetsMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={replacePresetsMutation.isPending}
              >
                {replacePresetsMutation.isPending ? "Saving..." : "Save Shortcuts"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
