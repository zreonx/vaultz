"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Handshake,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { formatMoney } from "@/lib/utils/currency";
import { formatTableDate } from "@/lib/utils/date";
import { useWorkspace } from "@/context/workspace-context";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  LendingStatus,
  LendingType,
  type CreateLendingRecordRequest,
  type LendingRecordResponse,
  type LendingSummaryResponse,
  type RecordLendingPaymentRequest,
} from "@/types/api";
import { AuthRequiredBanner } from "@/components/shared/auth-required-banner";
import { DataTableSearch, DataTableShell, DataTableToolbar } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";

function getLocalTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function LendingFeatureView() {
  const { data: user, isLoading: isAuthLoading } = useCurrentUser();
  const { activeWorkspace, activeCurrencyCode } = useWorkspace();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRecordForPayment, setSelectedRecordForPayment] =
    useState<LendingRecordResponse | null>(null);

  // Create form state
  const [createType, setCreateType] = useState<LendingType>(LendingType.Lent);
  const [createPerson, setCreatePerson] = useState("");
  const [createAmount, setCreateAmount] = useState("");
  const [createDueDate, setCreateDueDate] = useState<string | null>(null);
  const [createNotes, setCreateNotes] = useState("");
  const [createSyncBalance, setCreateSyncBalance] = useState(true);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(getLocalTodayIso());
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentSyncBalance, setPaymentSyncBalance] = useState(true);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["lending", activeWorkspace?.id],
    queryFn: () => {
      const url = activeWorkspace?.id
        ? `/api/v1/lending?accountId=${activeWorkspace.id}`
        : "/api/v1/lending";
      return apiClient.get<LendingSummaryResponse>(url);
    },
    enabled: Boolean(user && activeWorkspace?.id),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateLendingRecordRequest) =>
      apiClient.post<LendingRecordResponse>("/api/v1/lending", data),
    onSuccess: (record) => {
      toast.success(
        record.type === LendingType.Lent ? "Money Lent Logged" : "Borrowed Money Logged",
        {
          description: `Recorded IOU for ${record.counterparty} (${formatMoney(record.originalAmount, record.currencyCode)}).`,
        }
      );
      setIsCreateOpen(false);
      resetCreateForm();
      void queryClient.invalidateQueries({ queryKey: ["lending"] });
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: Error) => {
      toast.error("Could not create IOU", {
        description: err.message || "Please check your inputs and try again.",
      });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RecordLendingPaymentRequest }) =>
      apiClient.post(`/api/v1/lending/${id}/payments`, data),
    onSuccess: () => {
      toast.success("Repayment Recorded", {
        description: `Successfully logged repayment of ${formatMoney(Number(paymentAmount), activeWorkspace?.currencyCode ?? "USD")}.`,
      });
      setSelectedRecordForPayment(null);
      resetPaymentForm();
      void queryClient.invalidateQueries({ queryKey: ["lending"] });
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: Error) => {
      toast.error("Could not record payment", {
        description: err.message || "An error occurred.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/lending/${id}`),
    onSuccess: () => {
      toast.success("Record Deleted", {
        description: "The IOU record was removed.",
      });
      void queryClient.invalidateQueries({ queryKey: ["lending"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: Error) => {
      toast.error("Delete failed", {
        description: err.message || "Could not delete record.",
      });
    },
  });

  const resetCreateForm = () => {
    setCreateType(LendingType.Lent);
    setCreatePerson("");
    setCreateAmount("");
    setCreateDueDate(null);
    setCreateNotes("");
    setCreateSyncBalance(true);
  };

  const resetPaymentForm = () => {
    setPaymentAmount("");
    setPaymentDate(getLocalTodayIso());
    setPaymentNotes("");
    setPaymentSyncBalance(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace?.id) return;
    const num = Number(createAmount);
    if (!createPerson.trim() || isNaN(num) || num <= 0) {
      toast.error("Invalid inputs", {
        description: "Please enter a valid person's name and amount.",
      });
      return;
    }

    createMutation.mutate({
      accountId: activeWorkspace.id,
      type: createType,
      counterparty: createPerson.trim(),
      amount: num,
      dueDate: createDueDate || null,
      notes: createNotes.trim() || null,
      syncAccountBalance: createSyncBalance,
    });
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForPayment) return;
    const num = Number(paymentAmount);
    if (isNaN(num) || num <= 0) {
      toast.error("Invalid amount", {
        description: "Enter a positive repayment amount.",
      });
      return;
    }

    paymentMutation.mutate({
      id: selectedRecordForPayment.id,
      data: {
        amount: num,
        occurredOn: paymentDate,
        notes: paymentNotes.trim() || null,
        syncAccountBalance: paymentSyncBalance,
      },
    });
  };

  const filteredRecords = useMemo(() => {
    if (!summary?.records) return [];

    return summary.records.filter((r) => {
      // Tab filter
      if (activeTab === "lent" && (r.type !== LendingType.Lent || r.status !== LendingStatus.Active)) {
        return false;
      }
      if (activeTab === "borrowed" && (r.type !== LendingType.Borrowed || r.status !== LendingStatus.Active)) {
        return false;
      }
      if (activeTab === "settled" && r.status !== LendingStatus.Settled) {
        return false;
      }
      if (activeTab === "all" && r.status === LendingStatus.Settled) {
        // In "all", show active records by default
        return true;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = r.counterparty.toLowerCase().includes(query);
        const matchesNotes = r.notes?.toLowerCase().includes(query) ?? false;
        return matchesName || matchesNotes;
      }

      return true;
    });
  }, [summary?.records, activeTab, searchQuery]);

  if (!isAuthLoading && !user) {
    return <AuthRequiredBanner featureName="IOUs & Lending" />;
  }

  const todayIso = getLocalTodayIso();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">IOUs &amp; Lending</h2>
            {activeWorkspace && (
              <Badge variant="neutral" className="text-xs">
                {activeWorkspace.name}
              </Badge>
            )}
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {activeWorkspace
              ? `Casual lending, borrowing, and repayment tracking for ${activeWorkspace.name} (${activeWorkspace.currencyCode}).`
              : "Track who owes you and who you owe."}
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => {
            resetCreateForm();
            setIsCreateOpen(true);
          }}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add IOU
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="p-5">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <ArrowDownLeft className="h-3.5 w-3.5 text-[var(--accent)]" />
              Owed to You (Lent)
            </CardDescription>
            <CardTitle className="text-xl tabular-nums text-[var(--accent)]">
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                formatMoney(summary?.totalLentRemaining ?? 0, activeCurrencyCode)
              )}
            </CardTitle>
            <p className="text-xs text-[var(--muted-foreground)]">
              {summary?.activeLentCount ?? 0} active person(s)
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="p-5">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <ArrowUpRight className="h-3.5 w-3.5 text-[var(--danger)]" />
              You Owe (Borrowed)
            </CardDescription>
            <CardTitle className="text-xl tabular-nums text-[var(--danger)]">
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                formatMoney(summary?.totalBorrowedRemaining ?? 0, activeCurrencyCode)
              )}
            </CardTitle>
            <p className="text-xs text-[var(--muted-foreground)]">
              {summary?.activeBorrowedCount ?? 0} active debt(s)
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="p-5">
            <CardDescription className="text-xs">Net Position</CardDescription>
            <CardTitle
              className={`text-xl tabular-nums ${
                (summary?.netPosition ?? 0) >= 0
                  ? "text-[var(--accent)]"
                  : "text-[var(--danger)]"
              }`}
            >
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                `${(summary?.netPosition ?? 0) >= 0 ? "+" : ""}${formatMoney(
                  summary?.netPosition ?? 0,
                  activeCurrencyCode
                )}`
              )}
            </CardTitle>
            <p className="text-xs text-[var(--muted-foreground)]">
              Receivables minus payables
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* Outside Table Toolbar: Search & Filter Tabs */}
      <DataTableToolbar>
        <DataTableSearch
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery("")}
          placeholder="Search by person name or notes..."
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Active</TabsTrigger>
            <TabsTrigger value="lent">Owed to You</TabsTrigger>
            <TabsTrigger value="borrowed">You Owe</TabsTrigger>
            <TabsTrigger value="settled">Settled</TabsTrigger>
          </TabsList>
        </Tabs>
      </DataTableToolbar>

      {/* Standardized Reusable DataTableShell */}
      <DataTableShell
        title={activeWorkspace ? `IOU Records in ${activeWorkspace.name}` : "IOU Records"}
        description="Track personal loans and log partial or complete repayments."
        badge={
          isLoading ? (
            <Skeleton className="h-5 w-8 rounded-full" />
          ) : filteredRecords.length > 0 ? (
            <Badge variant="neutral" className="tabular-nums">
              {filteredRecords.length}
            </Badge>
          ) : undefined
        }
        isLoading={isLoading}
        loadingColumns={4}
        loadingRows={4}
        isEmpty={filteredRecords.length === 0}
        emptyTitle={
          searchQuery.trim()
            ? "No IOUs match your search"
            : activeTab === "settled"
            ? "No settled IOUs yet"
            : "No active IOUs recorded"
        }
        emptyDescription={
          searchQuery.trim()
            ? `No records found matching "${searchQuery}".`
            : "Log when you lend money to friends or borrow from someone."
        }
        emptyIcon={<Handshake className="h-4 w-4 text-[var(--muted-foreground)] mt-0.5" />}
        emptyAction={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              resetCreateForm();
              setIsCreateOpen(true);
            }}
            className="gap-1.5 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add IOU
          </Button>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person &amp; Direction</TableHead>
              <TableHead>Repayment Progress</TableHead>
              <TableHead className="text-right">Remaining Balance</TableHead>
              <TableHead className="text-right">Due Date / Status</TableHead>
              <TableHead className="w-12 text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((r) => {
              const isLent = r.type === LendingType.Lent;
              const isSettled = r.status === LendingStatus.Settled;
              const isOverdue =
                !isSettled && r.dueDate && r.dueDate < todayIso;

              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{r.counterparty}</span>
                      <Badge
                        variant={isLent ? "default" : "warning"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {isLent ? "Lent to them" : "Borrowed"}
                      </Badge>
                    </div>
                    {r.notes && (
                      <div className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate max-w-xs">
                        {r.notes}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="min-w-[180px]">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs tabular-nums text-[var(--muted-foreground)]">
                        <span>
                          {formatMoney(r.repaidAmount, r.currencyCode)} / {formatMoney(r.originalAmount, r.currencyCode)}
                        </span>
                        <span>{r.progressPercent}%</span>
                      </div>
                      <Progress value={r.progressPercent} />
                    </div>
                  </TableCell>

                  <TableCell className="text-right tabular-nums font-semibold">
                    <span className={isLent ? "text-[var(--accent)]" : "text-[var(--danger)]"}>
                      {formatMoney(r.remainingAmount, r.currencyCode)}
                    </span>
                  </TableCell>

                  <TableCell className="text-right text-xs">
                    {isSettled ? (
                      <span className="inline-flex items-center gap-1 text-[var(--accent)] font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Settled
                      </span>
                    ) : r.dueDate ? (
                      <div>
                        <div className={`font-medium ${isOverdue ? "text-[var(--danger)]" : ""}`}>
                          {formatTableDate(r.dueDate)}
                        </div>
                        {isOverdue && (
                          <span className="text-[10px] text-[var(--danger)] font-semibold uppercase tracking-wider">
                            Overdue
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--muted-foreground)]">No due date</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!isSettled && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRecordForPayment(r);
                            setPaymentAmount(String(r.remainingAmount));
                            setPaymentDate(getLocalTodayIso());
                            setPaymentNotes("");
                            setPaymentSyncBalance(true);
                          }}
                          className="h-8 text-xs gap-1"
                        >
                          Repay
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => deleteMutation.mutate(r.id)}
                            className="text-[var(--danger)] focus:text-[var(--danger)]"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete IOU
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/* Modal 1: Create IOU */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Personal IOU</DialogTitle>
            <DialogDescription>
              Record money lent to a friend or borrowed from someone in {activeWorkspace?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {/* Direction Toggle */}
            <div className="space-y-1.5">
              <Label>Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={createType === LendingType.Lent ? "default" : "outline"}
                  onClick={() => setCreateType(LendingType.Lent)}
                  className="w-full gap-1.5"
                >
                  <ArrowDownLeft className="h-4 w-4" />
                  I Lent Money
                </Button>
                <Button
                  type="button"
                  variant={createType === LendingType.Borrowed ? "default" : "outline"}
                  onClick={() => setCreateType(LendingType.Borrowed)}
                  className="w-full gap-1.5"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  I Borrowed Money
                </Button>
              </div>
            </div>

            {/* Person Name */}
            <div className="space-y-1.5">
              <Label htmlFor="counterparty">
                {createType === LendingType.Lent ? "Who did you lend to?" : "Who did you borrow from?"}
              </Label>
              <Input
                id="counterparty"
                placeholder="e.g. Alex, Sarah, Brother"
                value={createPerson}
                onChange={(e) => setCreatePerson(e.target.value)}
                required
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="iou-amount">Amount ({activeCurrencyCode})</Label>
              <Input
                id="iou-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={createAmount}
                onChange={(e) => setCreateAmount(e.target.value)}
                required
              />
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label>Target Due Date (Optional)</Label>
              <DatePicker
                value={createDueDate || undefined}
                onChange={(date) => setCreateDueDate(date || null)}
                placeholder="Pick an optional return date"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="iou-notes">Notes / Reason (Optional)</Label>
              <Input
                id="iou-notes"
                placeholder="e.g. Dinner bill, concert ticket"
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
              />
            </div>

            {/* Balance Sync Checkbox */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3 space-y-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                <input
                  type="checkbox"
                  checked={createSyncBalance}
                  onChange={(e) => setCreateSyncBalance(e.target.checked)}
                  className="rounded border-[var(--border)] text-[var(--accent)]"
                />
                <span>Sync with {activeWorkspace?.name} balance</span>
              </label>
              <p className="text-[11px] text-[var(--muted-foreground)] ml-5">
                {createType === LendingType.Lent
                  ? `Deducts funds from ${activeWorkspace?.name} and logs an outflow transaction.`
                  : `Deposits funds into ${activeWorkspace?.name} and logs an inflow transaction.`}
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving…" : "Save IOU"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Log Repayment */}
      <Dialog
        open={Boolean(selectedRecordForPayment)}
        onOpenChange={(open) => {
          if (!open) setSelectedRecordForPayment(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Repayment</DialogTitle>
            <DialogDescription>
              {selectedRecordForPayment?.type === LendingType.Lent
                ? `Record money returned by ${selectedRecordForPayment?.counterparty}.`
                : `Record payment sent to ${selectedRecordForPayment?.counterparty}.`}
            </DialogDescription>
          </DialogHeader>

          {selectedRecordForPayment && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 flex justify-between text-xs">
                <div>
                  <span className="text-[var(--muted-foreground)]">Remaining Balance:</span>
                  <div className="text-base font-semibold tabular-nums mt-0.5">
                    {formatMoney(
                      selectedRecordForPayment.remainingAmount,
                      selectedRecordForPayment.currencyCode
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[var(--muted-foreground)]">Original Total:</span>
                  <div className="text-sm font-medium tabular-nums mt-0.5">
                    {formatMoney(
                      selectedRecordForPayment.originalAmount,
                      selectedRecordForPayment.currencyCode
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pay-amount">
                  Repayment Amount ({selectedRecordForPayment.currencyCode})
                </Label>
                <Input
                  id="pay-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedRecordForPayment.remainingAmount}
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Date Received / Paid</Label>
                <DatePicker
                  value={paymentDate}
                  onChange={(date) => setPaymentDate(date || getLocalTodayIso())}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pay-notes">Notes (Optional)</Label>
                <Input
                  id="pay-notes"
                  placeholder="e.g. Paid via cash or bank transfer"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>

              {/* Balance Sync */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3 space-y-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={paymentSyncBalance}
                    onChange={(e) => setPaymentSyncBalance(e.target.checked)}
                    className="rounded border-[var(--border)] text-[var(--accent)]"
                  />
                  <span>Sync with {activeWorkspace?.name} balance</span>
                </label>
                <p className="text-[11px] text-[var(--muted-foreground)] ml-5">
                  {selectedRecordForPayment.type === LendingType.Lent
                    ? `Credits ${activeWorkspace?.name} balance with the repayment amount.`
                    : `Debits ${activeWorkspace?.name} balance with the repayment amount.`}
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedRecordForPayment(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={paymentMutation.isPending}>
                  {paymentMutation.isPending ? "Recording…" : "Confirm Repayment"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
