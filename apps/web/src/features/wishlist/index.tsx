"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Heart,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { formatMoney } from "@/lib/utils/currency";
import { formatTableDate } from "@/lib/utils/date";
import { useWorkspace } from "@/context/workspace-context";
import { useCurrentUser } from "@/hooks/use-auth";
import { useAccounts, ACCOUNTS_QUERY_KEY } from "@/features/accounts";
import { useCategories } from "@/features/categories";
import { TRANSACTIONS_QUERY_KEY } from "@/features/transactions";
import {
  CategoryType,
  WishlistPriority,
  WishlistStatus,
  type WishlistItemResponse,
} from "@/types/api";
import { AuthRequiredBanner } from "@/components/shared/auth-required-banner";
import { SearchableCurrencySelect } from "@/components/shared/searchable-currency-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

function getTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getPriorityVariant(priority: WishlistPriority) {
  switch (priority) {
    case WishlistPriority.High:
      return "danger" as const;
    case WishlistPriority.Medium:
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

export function WishlistFeatureView() {
  const { data: user, isLoading: isAuthLoading } = useCurrentUser();
  const { activeWorkspace, activeCurrencyCode } = useWorkspace();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>(
    String(WishlistStatus.Wanted)
  );
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Create / Edit Dialog State
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItemResponse | null>(
    null
  );
  const [name, setName] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [priority, setPriority] = useState<WishlistPriority>(
    WishlistPriority.Medium
  );
  const [status, setStatus] = useState<WishlistStatus>(WishlistStatus.Wanted);
  const [accountId, setAccountId] = useState<string>("none");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [targetDate, setTargetDate] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Purchase Dialog State
  const [purchasingItem, setPurchasingItem] =
    useState<WishlistItemResponse | null>(null);
  const [logExpense, setLogExpense] = useState(true);
  const [purchaseAccountId, setPurchaseAccountId] = useState("");
  const [purchaseCategoryId, setPurchaseCategoryId] = useState("none");
  const [actualAmount, setActualAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(getTodayIso());
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ["wishlist", activeWorkspace?.id ?? "all"],
    queryFn: () => {
      const qs = activeWorkspace?.id
        ? `?accountId=${activeWorkspace.id}`
        : "";
      return apiClient.get<WishlistItemResponse[]>(`/api/v1/wishlist${qs}`);
    },
    enabled: Boolean(user),
  });

  const expenseCategories = useMemo(
    () =>
      categories.filter(
        (c) => !c.isArchived && c.type === CategoryType.Expense
      ),
    [categories]
  );

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (statusFilter !== "all" && item.status !== Number(statusFilter)) {
        return false;
      }
      if (
        priorityFilter !== "all" &&
        item.priority !== Number(priorityFilter)
      ) {
        return false;
      }
      return true;
    });
  }, [allItems, statusFilter, priorityFilter]);

  const stats = useMemo(() => {
    const wanted = allItems.filter((i) => i.status === WishlistStatus.Wanted);
    const purchased = allItems.filter(
      (i) => i.status === WishlistStatus.Purchased
    );
    const highPriorityCount = wanted.filter(
      (i) => i.priority === WishlistPriority.High
    ).length;
    const baseCurr =
      activeWorkspace?.currencyCode ||
      activeCurrencyCode ||
      user?.defaultCurrencyCode ||
      "USD";
    const sameCurrWanted = wanted.filter(
      (i) => i.currencyCode.toUpperCase() === baseCurr.toUpperCase()
    );
    const estimatedTotal = sameCurrWanted.reduce(
      (sum, i) => sum + i.estimatedPrice,
      0
    );
    return {
      wantedCount: wanted.length,
      purchasedCount: purchased.length,
      highPriorityCount,
      baseCurr,
      estimatedTotal,
      hasOtherCurrencies: sameCurrWanted.length !== wanted.length,
    };
  }, [
    allItems,
    activeWorkspace?.currencyCode,
    activeCurrencyCode,
    user?.defaultCurrencyCode,
  ]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const priceNum = Number(estimatedPrice);
      if (!name.trim()) {
        throw new Error("Item name is required.");
      }
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        throw new Error("Estimated price must be greater than zero.");
      }

      const resolvedAccountId = accountId !== "none" ? accountId : null;
      const resolvedCategoryId = categoryId !== "none" ? categoryId : null;

      if (editingItem) {
        return apiClient.put<WishlistItemResponse>(
          `/api/v1/wishlist/${editingItem.id}`,
          {
            name: name.trim(),
            estimatedPrice: priceNum,
            currencyCode,
            priority,
            status,
            accountId: resolvedAccountId,
            categoryId: resolvedCategoryId,
            targetDate: targetDate || null,
            url: url.trim() || null,
            notes: notes.trim() || null,
          }
        );
      }

      return apiClient.post<WishlistItemResponse>("/api/v1/wishlist", {
        name: name.trim(),
        estimatedPrice: priceNum,
        currencyCode,
        priority,
        accountId: resolvedAccountId,
        categoryId: resolvedCategoryId,
        targetDate: targetDate || null,
        url: url.trim() || null,
        notes: notes.trim() || null,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      setFormOpen(false);
    },
    onError: (err) => {
      setFormError(
        err instanceof Error ? err.message : "Could not save wishlist item."
      );
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!purchasingItem) return;
      const parsedAmount = actualAmount.trim() ? Number(actualAmount) : null;
      if (logExpense) {
        if (!purchaseAccountId) {
          throw new Error("Select an account to record the expense.");
        }
        const selectedAcct = accounts.find((a) => a.id === purchaseAccountId);
        if (
          selectedAcct &&
          selectedAcct.currencyCode.toUpperCase() !==
            purchasingItem.currencyCode.toUpperCase() &&
          (!parsedAmount || parsedAmount <= 0)
        ) {
          throw new Error(
            `Enter the actual amount paid in ${selectedAcct.currencyCode}.`
          );
        }
      }

      return apiClient.post<WishlistItemResponse>(
        `/api/v1/wishlist/${purchasingItem.id}/purchase`,
        {
          logExpense,
          accountId: logExpense ? purchaseAccountId || null : null,
          categoryId:
            logExpense && purchaseCategoryId !== "none"
              ? purchaseCategoryId
              : null,
          occurredOn: logExpense ? occurredOn : null,
          actualAmount: logExpense ? parsedAmount : null,
        }
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setPurchasingItem(null);
    },
    onError: (err) => {
      setPurchaseError(
        err instanceof Error ? err.message : "Failed to complete purchase."
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/wishlist/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });

  const openCreateDialog = () => {
    setEditingItem(null);
    setName("");
    setEstimatedPrice("");
    setCurrencyCode(
      activeWorkspace?.currencyCode ||
        activeCurrencyCode ||
        user?.defaultCurrencyCode ||
        "USD"
    );
    setPriority(WishlistPriority.Medium);
    setStatus(WishlistStatus.Wanted);
    setAccountId(activeWorkspace?.id ?? "none");
    setCategoryId("none");
    setTargetDate("");
    setUrl("");
    setNotes("");
    setFormError(null);
    setFormOpen(true);
  };

  const openEditDialog = (item: WishlistItemResponse) => {
    setEditingItem(item);
    setName(item.name);
    setEstimatedPrice(String(item.estimatedPrice));
    setCurrencyCode(item.currencyCode);
    setPriority(item.priority);
    setStatus(item.status);
    setAccountId(item.accountId ?? "none");
    setCategoryId(item.categoryId ?? "none");
    setTargetDate(item.targetDate ? item.targetDate.slice(0, 10) : "");
    setUrl(item.url ?? "");
    setNotes(item.notes ?? "");
    setFormError(null);
    setFormOpen(true);
  };

  const openPurchaseDialog = (item: WishlistItemResponse) => {
    const defaultAcct =
      accounts.find((a) => a.id === item.accountId) ||
      activeWorkspace ||
      accounts[0];
    setPurchasingItem(item);
    setLogExpense(Boolean(defaultAcct));
    setPurchaseAccountId(defaultAcct?.id ?? "");
    setPurchaseCategoryId(item.categoryId ?? "none");
    setActualAmount(
      defaultAcct &&
        defaultAcct.currencyCode.toUpperCase() ===
          item.currencyCode.toUpperCase()
        ? String(item.estimatedPrice)
        : ""
    );
    setOccurredOn(getTodayIso());
    setPurchaseError(null);
  };

  if (!isAuthLoading && !user) {
    return <AuthRequiredBanner featureName="Wishlist" />;
  }

  const purchaseAccount = accounts.find((a) => a.id === purchaseAccountId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Wishlist</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {activeWorkspace
              ? `Plan upcoming purchases and convert bought items into expenses for ${activeWorkspace.name}.`
              : "Track planned purchases, compare priorities, and log bought items straight to your ledger."}
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Add Wishlist Item
        </Button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Wanted Items</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {stats.wantedCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-[var(--muted-foreground)]">
            {stats.highPriorityCount} high priority
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Estimated Wanted Total ({stats.baseCurr})
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatMoney(stats.estimatedTotal, stats.baseCurr)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-[var(--muted-foreground)]">
            {stats.hasOtherCurrencies
              ? "Excludes items in other currencies"
              : "Ready for budget planning"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Purchased</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {stats.purchasedCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-[var(--muted-foreground)]">
            Completed wishlist items
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1">
          {[
            { value: String(WishlistStatus.Wanted), label: "Wanted" },
            { value: String(WishlistStatus.Purchased), label: "Purchased" },
            { value: String(WishlistStatus.Archived), label: "Archived" },
            { value: "all", label: "All" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-xs"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="w-44">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger aria-label="Filter Priority">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value={String(WishlistPriority.High)}>
                High Priority
              </SelectItem>
              <SelectItem value={String(WishlistPriority.Medium)}>
                Medium Priority
              </SelectItem>
              <SelectItem value={String(WishlistPriority.Low)}>
                Low Priority
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Heart className="mb-3 h-8 w-8 text-[var(--muted-foreground)]" />
            <p className="font-medium">No wishlist items match this view</p>
            <p className="mt-1 max-w-sm text-sm text-[var(--muted-foreground)]">
              Add gadgets, home upgrades, or gifts you plan to buy intentionally.
            </p>
            <Button className="mt-4" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Add Wishlist Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <Card key={item.id} className="flex flex-col justify-between">
              <CardHeader className="space-y-2 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={getPriorityVariant(item.priority)}>
                      {item.priorityName}
                    </Badge>
                    {item.status !== WishlistStatus.Wanted && (
                      <Badge
                        variant={
                          item.status === WishlistStatus.Purchased
                            ? "default"
                            : "neutral"
                        }
                      >
                        {item.statusName}
                      </Badge>
                    )}
                    {item.accountName && (
                      <Badge variant="neutral">{item.accountName}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                        aria-label={`Open link for ${item.name}`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditDialog(item)}
                      className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                      aria-label={`Edit ${item.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(item.id)}
                      className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--danger)]"
                      aria-label={`Delete ${item.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <CardTitle className="text-base">{item.name}</CardTitle>
                <div className="text-xl font-bold tabular-nums text-[var(--accent)]">
                  {formatMoney(item.estimatedPrice, item.currencyCode)}
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <div className="flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
                  {item.categoryName && <span>{item.categoryName}</span>}
                  {item.targetDate && (
                    <span>Target: {formatTableDate(item.targetDate)}</span>
                  )}
                </div>

                {item.notes && (
                  <p className="line-clamp-2 text-xs text-[var(--muted-foreground)]">
                    {item.notes}
                  </p>
                )}

                {item.status !== WishlistStatus.Purchased ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => openPurchaseDialog(item)}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Mark Purchased
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent)]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      Purchased
                      {item.purchasedTransactionId
                        ? " · Expense Logged"
                        : ""}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden gap-0">
          <DialogHeader className="px-6 pt-5 pb-3.5 border-b border-[var(--border-subtle)] shrink-0">
            <DialogTitle>
              {editingItem ? "Edit Wishlist Item" : "New Wishlist Item"}
            </DialogTitle>
            <DialogDescription>
              Track price, priority, target timing, and optional store URL.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Invalid Details</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="wish-name">Item Name</Label>
              <Input
                id="wish-name"
                placeholder="e.g., Standing Desk, Noise-Canceling Headphones"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="wish-price">Estimated Price</Label>
                <Input
                  id="wish-price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="tabular-nums"
                  value={estimatedPrice}
                  onChange={(e) => setEstimatedPrice(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label>Currency</Label>
                <SearchableCurrencySelect
                  value={currencyCode}
                  onValueChange={setCurrencyCode}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 min-w-0">
                <Label>Priority</Label>
                <Select
                  value={String(priority)}
                  onValueChange={(v) =>
                    setPriority(Number(v) as WishlistPriority)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(WishlistPriority.High)}>
                      High
                    </SelectItem>
                    <SelectItem value={String(WishlistPriority.Medium)}>
                      Medium
                    </SelectItem>
                    <SelectItem value={String(WishlistPriority.Low)}>
                      Low
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label>Account Scope</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All Accounts (General)</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.currencyCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 min-w-0">
                <Label>Category (Optional)</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Uncategorized" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {expenseCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label>Target Date (Optional)</Label>
                <DatePicker value={targetDate} onChange={setTargetDate} />
              </div>
            </div>

            {editingItem && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={String(status)}
                  onValueChange={(v) => setStatus(Number(v) as WishlistStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(WishlistStatus.Wanted)}>
                      Wanted
                    </SelectItem>
                    <SelectItem value={String(WishlistStatus.Purchased)}>
                      Purchased
                    </SelectItem>
                    <SelectItem value={String(WishlistStatus.Archived)}>
                      Archived
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="wish-url">Store Link (Optional)</Label>
              <Input
                id="wish-url"
                placeholder="https://example.com/product"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wish-notes">Notes (Optional)</Label>
              <Textarea
                id="wish-notes"
                rows={2}
                placeholder="Model details, wait for sale, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)]/40">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setFormError(null);
                saveMutation.mutate();
              }}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending
                ? "Saving…"
                : editingItem
                ? "Save Changes"
                : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Purchased Dialog */}
      <Dialog
        open={Boolean(purchasingItem)}
        onOpenChange={(open) => {
          if (!open) setPurchasingItem(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90dvh] flex flex-col p-0 overflow-hidden gap-0">
          <DialogHeader className="px-6 pt-5 pb-3.5 border-b border-[var(--border-subtle)] shrink-0">
            <DialogTitle>Mark as Purchased</DialogTitle>
            <DialogDescription>
              {purchasingItem
                ? `${purchasingItem.name} (${formatMoney(
                    purchasingItem.estimatedPrice,
                    purchasingItem.currencyCode
                  )})`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            {purchaseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Cannot Complete Purchase</AlertTitle>
                <AlertDescription>{purchaseError}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/50 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  Log as Expense Transaction
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Atomically deduct from account balance
                </p>
              </div>
              <Switch
                checked={logExpense}
                disabled={accounts.length === 0}
                onCheckedChange={setLogExpense}
              />
            </div>

            {logExpense && (
              <>
                <div className="space-y-1.5">
                  <Label>Account</Label>
                  <Select
                    value={purchaseAccountId}
                    onValueChange={(id) => {
                      setPurchaseAccountId(id);
                      const acct = accounts.find((a) => a.id === id);
                      if (
                        acct &&
                        purchasingItem &&
                        acct.currencyCode.toUpperCase() ===
                          purchasingItem.currencyCode.toUpperCase()
                      ) {
                        setActualAmount(String(purchasingItem.estimatedPrice));
                      } else {
                        setActualAmount("");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} ({a.currencyCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor="purchase-amount">
                      Actual Paid ({purchaseAccount?.currencyCode || ""})
                    </Label>
                    <Input
                      id="purchase-amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="tabular-nums"
                      value={actualAmount}
                      onChange={(e) => setActualAmount(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <Label>Purchase Date</Label>
                    <DatePicker value={occurredOn} onChange={setOccurredOn} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={purchaseCategoryId}
                    onValueChange={setPurchaseCategoryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Uncategorized" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Uncategorized</SelectItem>
                      {expenseCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="px-6 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)]/40">
            <Button
              variant="outline"
              onClick={() => setPurchasingItem(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setPurchaseError(null);
                purchaseMutation.mutate();
              }}
              disabled={purchaseMutation.isPending}
            >
              {purchaseMutation.isPending ? "Recording…" : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
