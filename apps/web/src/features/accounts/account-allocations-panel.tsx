"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Layers,
  Percent,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  Vault,
  Wallet,
  X,
} from "lucide-react";
import {
  AccountAllocationDto,
  AccountAllocationsOverviewResponse,
  AllocationCategory,
  MonthlyBudgetSliceDto,
} from "@/types/api";
import { formatMoney } from "@/lib/utils/currency";
import {
  useAccountAllocations,
  useCloseMonthlyPlanMutation,
  useCoverSliceDeficitMutation,
  useCreateAllocationMutation,
  useCreateMonthlyPlanMutation,
  useDeleteAllocationMutation,
  useDepositAllocationMutation,
  useSweepMonthlyPlanMutation,
  useWithdrawAllocationMutation,
} from "@/hooks/use-account-allocations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface AccountAllocationsPanelProps {
  accountId: string;
  accountName: string;
  currencyCode: string;
}

export function AccountAllocationsPanel({
  accountId,
  accountName,
  currencyCode,
}: AccountAllocationsPanelProps) {
  const { data: overview, isLoading } = useAccountAllocations(accountId);

  // Dialog States
  const [isCreateAllocOpen, setIsCreateAllocOpen] = useState(false);
  const [depositAlloc, setDepositAlloc] = useState<AccountAllocationDto | null>(null);
  const [withdrawAlloc, setWithdrawAlloc] = useState<AccountAllocationDto | null>(null);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isCoverDeficitOpen, setIsCoverDeficitOpen] = useState(false);
  const [isSweepOpen, setIsSweepOpen] = useState(false);

  // Mutations
  const deleteAllocMutation = useDeleteAllocationMutation();
  const closePlanMutation = useCloseMonthlyPlanMutation();

  if (isLoading || !overview) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const {
    accountBalance,
    totalAllocatedInVaults,
    activePlanRemaining,
    unallocatedBalance,
    allocations,
    activeBudgetPlan,
  } = overview;

  return (
    <div className="space-y-6 pt-2">
      {/* 2-Tier Allocation Overview Banner */}
      <Card className="overflow-hidden border-[var(--border)] bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-[var(--muted)]/20 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2">
                <Badge variant="neutral" className="gap-1 border-[var(--accent)]/30 text-[var(--accent)]">
                  <Layers className="h-3.5 w-3.5" />
                  2-Tier Architecture
                </Badge>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {accountName} ({currencyCode})
                </span>
              </div>
              <CardTitle className="text-xl font-bold tracking-tight">
                Funds Partition & Logical Finance
              </CardTitle>
              <CardDescription>
                Walled-off permanent purpose vaults & active monthly percentage fragments.
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase font-medium tracking-wider text-[var(--muted-foreground)]">
                Physical Account Balance
              </span>
              <div className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                {formatMoney(accountBalance, currencyCode)}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 transition-all">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4" />
                  Tier 1: Purpose Vaults
                </span>
                <span className="tabular-nums">
                  {accountBalance > 0
                    ? `${Math.round((totalAllocatedInVaults / accountBalance) * 100)}%`
                    : "0%"}
                </span>
              </div>
              <div className="mt-2 text-xl font-bold tabular-nums text-[var(--foreground)]">
                {formatMoney(totalAllocatedInVaults, currencyCode)}
              </div>
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                Protected reserves (Emergency, Savings)
              </p>
            </div>

            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3.5 transition-all">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Tier 2: Active Allowance
                </span>
                <span className="tabular-nums">
                  {accountBalance > 0
                    ? `${Math.round((activePlanRemaining / accountBalance) * 100)}%`
                    : "0%"}
                </span>
              </div>
              <div className="mt-2 text-xl font-bold tabular-nums text-[var(--foreground)]">
                {formatMoney(activePlanRemaining, currencyCode)}
              </div>
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                {activeBudgetPlan ? "Remaining in monthly cycle" : "No active plan"}
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 transition-all">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
                <span className="flex items-center gap-1.5">
                  <Wallet className="h-4 w-4" />
                  Available Cash
                </span>
                <span className="tabular-nums">
                  {accountBalance > 0
                    ? `${Math.round((unallocatedBalance / accountBalance) * 100)}%`
                    : "0%"}
                </span>
              </div>
              <div className="mt-2 text-xl font-bold tabular-nums text-[var(--foreground)]">
                {formatMoney(unallocatedBalance, currencyCode)}
              </div>
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                Free capital ready to allocate
              </p>
            </div>
          </div>

          {/* Segmented visualizer bar */}
          {accountBalance > 0 && (
            <div className="space-y-1.5">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--muted)] flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (totalAllocatedInVaults / accountBalance) * 100)}%`,
                  }}
                  title={`Vaults: ${formatMoney(totalAllocatedInVaults, currencyCode)}`}
                />
                <div
                  className="h-full bg-indigo-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (activePlanRemaining / accountBalance) * 100)}%`,
                  }}
                  title={`Active Plan: ${formatMoney(activePlanRemaining, currencyCode)}`}
                />
                <div
                  className="h-full bg-amber-400 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (unallocatedBalance / accountBalance) * 100)}%`,
                  }}
                  title={`Available: ${formatMoney(unallocatedBalance, currencyCode)}`}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[var(--muted-foreground)]">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Vaults
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" /> Active Plan
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> Available Free Cash
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2-Columns: Tier 1 (Vaults) & Tier 2 (Monthly Plan) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tier 1: Purpose Allocations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
                <Vault className="h-4 w-4 text-emerald-500" />
                Tier 1: Purpose Vaults
              </h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                Permanent reserves protected from everyday transactions.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-8"
              onClick={() => setIsCreateAllocOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Vault
            </Button>
          </div>

          {allocations.length === 0 ? (
            <Card className="border-dashed border-[var(--border)] p-6 text-center">
              <Shield className="mx-auto h-8 w-8 text-[var(--muted-foreground)] opacity-50" />
              <h4 className="mt-2 text-sm font-semibold">No Purpose Vaults Yet</h4>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Carve out an Emergency Fund or Long-Term Savings vault from your available balance.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-4 gap-1.5 text-xs"
                onClick={() => setIsCreateAllocOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Create First Vault
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {allocations.map((alloc) => {
                const target = alloc.targetAmount ?? 0;
                const progressPct = target > 0 ? Math.min(100, Math.round((alloc.balance / target) * 100)) : null;

                return (
                  <Card key={alloc.id} className="p-4 border-[var(--border)] transition-shadow hover:shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[var(--foreground)]">
                            {alloc.name}
                          </span>
                          <Badge variant="neutral" className="text-[10px] px-1.5 py-0">
                            {alloc.categoryName}
                          </Badge>
                        </div>
                        <div className="text-lg font-bold tabular-nums text-[var(--foreground)]">
                          {formatMoney(alloc.balance, currencyCode)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          onClick={() => setDepositAlloc(alloc)}
                          title="Deposit into this vault"
                        >
                          <ArrowDownRight className="h-3.5 w-3.5 mr-1" />
                          Deposit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          onClick={() => setWithdrawAlloc(alloc)}
                          disabled={alloc.balance <= 0}
                          title="Withdraw back to available cash"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                          Withdraw
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-[var(--muted-foreground)] hover:text-red-500"
                          onClick={() => {
                            if (confirm(`Delete '${alloc.name}'? Any remaining funds (${formatMoney(alloc.balance, currencyCode)}) will return to your available balance.`)) {
                              deleteAllocMutation.mutate({ accountId, id: alloc.id });
                            }
                          }}
                          title="Delete vault"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {progressPct !== null && (
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[11px] text-[var(--muted-foreground)]">
                          <span>Target: {formatMoney(target, currencyCode)}</span>
                          <span className="font-medium text-[var(--foreground)]">{progressPct}%</span>
                        </div>
                        <Progress value={progressPct} className="h-1.5" />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Tier 2: Monthly Logical Finance Plan */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                Tier 2: Monthly Logical Finance Plan
              </h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                Percentage spending fragments that do not auto-adjust across expenses.
              </p>
            </div>

            {activeBudgetPlan ? (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs h-8 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                  onClick={() => setIsCoverDeficitOpen(true)}
                  title="Strict Rule: Transfer between slices to cover overdrafts"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Cover Deficit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="gap-1.5 text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => setIsSweepOpen(true)}
                  title="Sweep leftover allowance into vault or savings anytime"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Sweep
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                className="gap-1.5 text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => setIsCreatePlanOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Create Plan
              </Button>
            )}
          </div>

          {!activeBudgetPlan ? (
            <Card className="border-dashed border-[var(--border)] p-6 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-indigo-400 opacity-60" />
              <h4 className="mt-2 text-sm font-semibold">No Active Monthly Plan</h4>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Allocate a monthly spending allowance (e.g. 50% Essentials, 30% Wants, 20% Bills) from your available cash.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-4 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => setIsCreatePlanOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Setup Monthly Finance Plan
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Plan Header Card */}
              <Card className="p-4 border-indigo-500/20 bg-indigo-500/5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Period: {activeBudgetPlan.year}-{String(activeBudgetPlan.month).padStart(2, "0")}
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-lg font-bold tabular-nums">
                        {formatMoney(activeBudgetPlan.totalRemaining, currencyCode)}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        remaining of {formatMoney(activeBudgetPlan.totalBudgetAmount, currencyCode)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-[var(--muted-foreground)] hover:text-red-500 h-7"
                      onClick={() => {
                        if (confirm("Close this active plan? Unspent funds will safely return to available cash.")) {
                          closePlanMutation.mutate({ accountId, planId: activeBudgetPlan.id });
                        }
                      }}
                    >
                      Close Plan
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Slices List */}
              <div className="space-y-2.5">
                {activeBudgetPlan.slices.map((slice) => {
                  const spentPct = slice.allocatedAmount > 0
                    ? Math.min(100, Math.round((slice.spentAmount / slice.allocatedAmount) * 100))
                    : 0;

                  return (
                    <Card key={slice.id} className="p-3.5 border-[var(--border)]">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{slice.name}</span>
                          <Badge variant="neutral" className="text-[10px] tabular-nums">
                            {slice.allocationPercentage}%
                          </Badge>
                          {slice.categoryName && (
                            <span className="text-xs text-[var(--muted-foreground)]">
                              ({slice.categoryName})
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-bold tabular-nums text-sm">
                            {formatMoney(slice.remainingAmount, currencyCode)}
                          </span>
                          <span className="text-xs text-[var(--muted-foreground)] block">
                            Spent {formatMoney(slice.spentAmount, currencyCode)} of {formatMoney(slice.allocatedAmount, currencyCode)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 space-y-1">
                        <Progress
                          value={spentPct}
                          className="h-1.5"
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Create Allocation */}
      <CreateAllocationDialog
        open={isCreateAllocOpen}
        onOpenChange={setIsCreateAllocOpen}
        accountId={accountId}
        availableBalance={unallocatedBalance}
        currencyCode={currencyCode}
      />

      {/* MODAL 2: Deposit to Allocation */}
      {depositAlloc && (
        <DepositWithdrawDialog
          mode="deposit"
          open={Boolean(depositAlloc)}
          onOpenChange={(open) => !open && setDepositAlloc(null)}
          accountId={accountId}
          allocation={depositAlloc}
          maxAmount={unallocatedBalance}
          currencyCode={currencyCode}
        />
      )}

      {/* MODAL 3: Withdraw from Allocation */}
      {withdrawAlloc && (
        <DepositWithdrawDialog
          mode="withdraw"
          open={Boolean(withdrawAlloc)}
          onOpenChange={(open) => !open && setWithdrawAlloc(null)}
          accountId={accountId}
          allocation={withdrawAlloc}
          maxAmount={withdrawAlloc.balance}
          currencyCode={currencyCode}
        />
      )}

      {/* MODAL 4: Create Monthly Budget Plan */}
      <CreateMonthlyPlanDialog
        open={isCreatePlanOpen}
        onOpenChange={setIsCreatePlanOpen}
        accountId={accountId}
        availableBalance={unallocatedBalance}
        currencyCode={currencyCode}
      />

      {/* MODAL 5: Cover Slice Deficit */}
      {activeBudgetPlan && isCoverDeficitOpen && (
        <CoverSliceDeficitDialog
          open={isCoverDeficitOpen}
          onOpenChange={setIsCoverDeficitOpen}
          accountId={accountId}
          plan={activeBudgetPlan}
          currencyCode={currencyCode}
        />
      )}

      {/* MODAL 6: Sweep Plan */}
      {activeBudgetPlan && isSweepOpen && (
        <SweepPlanDialog
          open={isSweepOpen}
          onOpenChange={setIsSweepOpen}
          accountId={accountId}
          plan={activeBudgetPlan}
          allocations={allocations}
          currencyCode={currencyCode}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MODALS
// ---------------------------------------------------------------------------

function CreateAllocationDialog({
  open,
  onOpenChange,
  accountId,
  availableBalance,
  currencyCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  availableBalance: number;
  currencyCode: string;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<AllocationCategory>(AllocationCategory.Emergency);
  const [initialBalance, setInitialBalance] = useState<string>("0");
  const [targetAmount, setTargetAmount] = useState<string>("");

  const createMutation = useCreateAllocationMutation();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const balanceNum = parseFloat(initialBalance) || 0;
    const targetNum = targetAmount ? parseFloat(targetAmount) : null;

    createMutation.mutate(
      {
        accountId,
        data: {
          name: name.trim(),
          category,
          initialBalance: balanceNum,
          targetAmount: targetNum,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setName("");
          setInitialBalance("0");
          setTargetAmount("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Purpose Vault (Tier 1)</DialogTitle>
          <DialogDescription>
            Create an isolated reserve like an Emergency Fund or Savings Goal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="alloc-name">Vault Name</Label>
            <Input
              id="alloc-name"
              placeholder="e.g. Emergency Fund, Sinking Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alloc-cat">Category</Label>
            <Select
              value={String(category)}
              onValueChange={(val) => setCategory(Number(val) as AllocationCategory)}
            >
              <SelectTrigger id="alloc-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={String(AllocationCategory.Emergency)}>Emergency Fund</SelectItem>
                <SelectItem value={String(AllocationCategory.Savings)}>Savings Vault</SelectItem>
                <SelectItem value={String(AllocationCategory.Bills)}>Bills & Sinking</SelectItem>
                <SelectItem value={String(AllocationCategory.Custom)}>Custom Purpose</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="alloc-balance">Initial Deposit ({currencyCode})</Label>
              <span className="text-xs text-[var(--muted-foreground)]">
                Max available: {formatMoney(availableBalance, currencyCode)}
              </span>
            </div>
            <Input
              id="alloc-balance"
              type="number"
              step="any"
              min="0"
              max={availableBalance}
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alloc-target">Target Goal Amount ({currencyCode}) — Optional</Label>
            <Input
              id="alloc-target"
              type="number"
              step="any"
              min="1"
              placeholder="e.g. 50000"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !name.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createMutation.isPending ? "Creating..." : "Create Vault"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DepositWithdrawDialog({
  mode,
  open,
  onOpenChange,
  accountId,
  allocation,
  maxAmount,
  currencyCode,
}: {
  mode: "deposit" | "withdraw";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  allocation: AccountAllocationDto;
  maxAmount: number;
  currencyCode: string;
}) {
  const [amount, setAmount] = useState<string>("");
  const depositMutation = useDepositAllocationMutation();
  const withdrawMutation = useWithdrawAllocationMutation();

  const isDeposit = mode === "deposit";
  const isPending = depositMutation.isPending || withdrawMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;

    if (isDeposit) {
      depositMutation.mutate(
        { accountId, id: allocation.id, amount: parsedAmount },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      withdrawMutation.mutate(
        { accountId, id: allocation.id, amount: parsedAmount },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isDeposit ? `Deposit to ${allocation.name}` : `Withdraw from ${allocation.name}`}
          </DialogTitle>
          <DialogDescription>
            {isDeposit
              ? `Move funds from available cash into this protected vault.`
              : `Return funds from this vault back into your available account cash.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="transfer-amt">Amount ({currencyCode})</Label>
              <span className="text-xs text-[var(--muted-foreground)]">
                Max: {formatMoney(maxAmount, currencyCode)}
              </span>
            </div>
            <Input
              id="transfer-amt"
              type="number"
              step="any"
              min="0.01"
              max={maxAmount}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !parseFloat(amount) || parseFloat(amount) > maxAmount}
              className={isDeposit ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
            >
              {isPending ? "Processing..." : isDeposit ? "Confirm Deposit" : "Confirm Withdrawal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateMonthlyPlanDialog({
  open,
  onOpenChange,
  accountId,
  availableBalance,
  currencyCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  availableBalance: number;
  currencyCode: string;
}) {
  const now = new Date();
  const [totalBudget, setTotalBudget] = useState<string>(
    availableBalance > 0 ? String(Math.floor(availableBalance)) : "0"
  );
  const [year] = useState<number>(now.getFullYear());
  const [month] = useState<number>(now.getMonth() + 1);

  const [slices, setSlices] = useState<
    { id: string; name: string; percentage: number }[]
  >([
    { id: "1", name: "Essentials & Needs", percentage: 50 },
    { id: "2", name: "Lifestyle & Wants", percentage: 30 },
    { id: "3", name: "Bills & Subscriptions", percentage: 20 },
  ]);

  const createPlanMutation = useCreateMonthlyPlanMutation();

  const totalPercentage = useMemo(
    () => slices.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0),
    [slices]
  );

  const budgetNum = parseFloat(totalBudget) || 0;

  const handlePercentageChange = (id: string, val: string) => {
    const num = parseFloat(val) || 0;
    setSlices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, percentage: num } : s))
    );
  };

  const handleNameChange = (id: string, val: string) => {
    setSlices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: val } : s))
    );
  };

  const addSlice = () => {
    setSlices((prev) => [
      ...prev,
      { id: String(Date.now()), name: "New Category Slice", percentage: 0 },
    ]);
  };

  const removeSlice = (id: string) => {
    if (slices.length <= 1) return;
    setSlices((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Math.abs(totalPercentage - 100) > 0.01) return;
    if (budgetNum <= 0 || budgetNum > availableBalance) return;

    createPlanMutation.mutate(
      {
        accountId,
        data: {
          year,
          month,
          totalBudgetAmount: budgetNum,
          slices: slices.map((s) => ({
            name: s.name.trim(),
            allocationPercentage: s.percentage,
          })),
        },
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Setup Monthly Finance Plan (Tier 2)</DialogTitle>
          <DialogDescription>
            Divide an active spending allowance into logical percentage slices.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="plan-budget">Total Monthly Allowance ({currencyCode})</Label>
              <span className="text-xs text-[var(--muted-foreground)]">
                Available: {formatMoney(availableBalance, currencyCode)}
              </span>
            </div>
            <Input
              id="plan-budget"
              type="number"
              step="any"
              min="1"
              max={availableBalance}
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Percentage Distribution Slices
              </Label>
              <span
                className={`text-xs font-semibold tabular-nums ${
                  Math.abs(totalPercentage - 100) < 0.01
                    ? "text-emerald-500"
                    : "text-red-500"
                }`}
              >
                Total: {totalPercentage}% / 100%
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {slices.map((slice) => {
                const calculatedSliceAmount =
                  budgetNum > 0 ? (slice.percentage / 100) * budgetNum : 0;

                return (
                  <div
                    key={slice.id}
                    className="flex items-center gap-2 p-2 rounded-lg border border-[var(--border)] bg-[var(--card)]"
                  >
                    <Input
                      value={slice.name}
                      onChange={(e) => handleNameChange(slice.id, e.target.value)}
                      placeholder="Slice Name"
                      className="h-8 text-xs flex-1"
                      required
                    />
                    <div className="flex items-center gap-1 w-24">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        max="100"
                        value={slice.percentage}
                        onChange={(e) => handlePercentageChange(slice.id, e.target.value)}
                        className="h-8 text-xs text-right tabular-nums"
                        required
                      />
                      <Percent className="h-3 w-3 text-[var(--muted-foreground)]" />
                    </div>
                    <span className="w-24 text-right text-xs font-medium tabular-nums text-[var(--muted-foreground)]">
                      {formatMoney(calculatedSliceAmount, currencyCode)}
                    </span>
                    {slices.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-[var(--muted-foreground)] hover:text-red-500"
                        onClick={() => removeSlice(slice.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1.5 h-8 mt-1"
              onClick={addSlice}
            >
              <Plus className="h-3 w-3" />
              Add Slice
            </Button>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createPlanMutation.isPending ||
                Math.abs(totalPercentage - 100) > 0.01 ||
                budgetNum <= 0 ||
                budgetNum > availableBalance
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {createPlanMutation.isPending ? "Activating..." : "Activate Monthly Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CoverSliceDeficitDialog({
  open,
  onOpenChange,
  accountId,
  plan,
  currencyCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  plan: NonNullable<AccountAllocationsOverviewResponse["activeBudgetPlan"]>;
  currencyCode: string;
}) {
  const [fromSliceId, setFromSliceId] = useState<string>(plan.slices[0]?.id || "");
  const [toSliceId, setToSliceId] = useState<string>(plan.slices[1]?.id || "");
  const [amount, setAmount] = useState<string>("");

  const coverMutation = useCoverSliceDeficitMutation();

  const sourceSlice = plan.slices.find((s) => s.id === fromSliceId);
  const maxAvailable = sourceSlice?.remainingAmount ?? 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0 || num > maxAvailable || fromSliceId === toSliceId) return;

    coverMutation.mutate(
      {
        accountId,
        planId: plan.id,
        data: {
          fromSliceId,
          toSliceId,
          amount: num,
        },
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cover Slice Deficit</DialogTitle>
          <DialogDescription>
            Strict Discipline: Transfer unspent budget from one slice to another to unlock transactions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="from-slice">Lend From (Source Slice)</Label>
            <Select value={fromSliceId} onValueChange={setFromSliceId}>
              <SelectTrigger id="from-slice">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {plan.slices.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({formatMoney(s.remainingAmount, currencyCode)} available)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="to-slice">Cover To (Target Slice)</Label>
            <Select value={toSliceId} onValueChange={setToSliceId}>
              <SelectTrigger id="to-slice">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {plan.slices
                  .filter((s) => s.id !== fromSliceId)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({formatMoney(s.remainingAmount, currencyCode)} remaining)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="cover-amt">Transfer Amount ({currencyCode})</Label>
              <span className="text-xs text-[var(--muted-foreground)]">
                Max: {formatMoney(maxAvailable, currencyCode)}
              </span>
            </div>
            <Input
              id="cover-amt"
              type="number"
              step="any"
              min="0.01"
              max={maxAvailable}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                coverMutation.isPending ||
                !parseFloat(amount) ||
                parseFloat(amount) > maxAvailable ||
                fromSliceId === toSliceId
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {coverMutation.isPending ? "Transferring..." : "Transfer Budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SweepPlanDialog({
  open,
  onOpenChange,
  accountId,
  plan,
  allocations,
  currencyCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  plan: NonNullable<AccountAllocationsOverviewResponse["activeBudgetPlan"]>;
  allocations: AccountAllocationDto[];
  currencyCode: string;
}) {
  const [targetAllocId, setTargetAllocId] = useState<string>("unallocated");
  const sweepMutation = useSweepMonthlyPlanMutation();

  const handleSweep = () => {
    sweepMutation.mutate(
      {
        accountId,
        planId: plan.id,
        targetAllocationId: targetAllocId === "unallocated" ? null : targetAllocId,
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sweep Unspent Allowance</DialogTitle>
          <DialogDescription>
            You have <strong className="text-[var(--foreground)]">{formatMoney(plan.totalRemaining, currencyCode)}</strong> unspent in this cycle. Sweep it immediately into a protected vault or back to available cash.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="sweep-dest">Sweep Destination</Label>
            <Select value={targetAllocId} onValueChange={setTargetAllocId}>
              <SelectTrigger id="sweep-dest">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unallocated">Available Cash (General Balance)</SelectItem>
                {allocations.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    Vault: {a.name} ({a.categoryName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-[var(--muted-foreground)]">
            This will close the active plan and deposit all unspent funds directly into your selected destination.
          </p>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSweep}
              disabled={sweepMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {sweepMutation.isPending ? "Sweeping..." : "Confirm Sweep"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
