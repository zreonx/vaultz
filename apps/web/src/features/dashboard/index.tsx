"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  PiggyBank,
  Plus,
  Wallet,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { formatRecordedTime, formatTableDate } from "@/lib/utils/date";
import { formatMoney } from "@/lib/utils/currency";
import { useWorkspace } from "@/context/workspace-context";
import { useCurrentUser } from "@/hooks/use-auth";
import { DataTableShell } from "@/components/shared/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TransactionType,
  type DashboardSummaryResponse,
} from "@/types/api";
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
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function DashboardOverviewFeature() {
  const { data: user } = useCurrentUser();
  const {
    workspaces,
    isLoadingWorkspaces,
    selectedWorkspaceId,
    activeWorkspace,
    activeCurrencyCode,
    setSelectedWorkspaceId,
    openTransferDialog,
    openCreateTransactionDialog,
  } = useWorkspace();

  const queryUrl = activeWorkspace?.id
    ? `/api/v1/dashboard?baseCurrency=${activeCurrencyCode}&accountId=${activeWorkspace.id}`
    : `/api/v1/dashboard?baseCurrency=${activeCurrencyCode}`;

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["dashboard", activeCurrencyCode, activeWorkspace?.id],
    queryFn: () => apiClient.get<DashboardSummaryResponse>(queryUrl),
    enabled: Boolean(user && activeWorkspace?.id),
  });

  const visibleRecentTransactions = summary?.recentTransactions ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
            {activeWorkspace && (
              <Badge variant="neutral" className="text-xs">
                {activeWorkspace.name}
              </Badge>
            )}
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {activeWorkspace
              ? `Account activity and financial performance for ${activeWorkspace.name} (${activeWorkspace.currencyCode}).`
              : "Account activity and financial performance."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {workspaces.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openTransferDialog(activeWorkspace?.id)}
              className="gap-1.5"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-[var(--accent)]" />
              Transfer
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={() => openCreateTransactionDialog()}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Transaction
          </Button>
        </div>
      </section>

      {/* Accounts Switcher Bar */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold">
              Your Accounts ({workspaces.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/accounts">
                Manage Accounts <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {isLoadingWorkspaces ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-12 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-20" />
              </Card>
            ))
          ) : (
            workspaces.map((ws) => {
              const isSelected = selectedWorkspaceId === ws.id;
              return (
                <Card
                  key={ws.id}
                  onClick={() => setSelectedWorkspaceId(ws.id)}
                  className={`cursor-pointer transition-all hover:border-[var(--accent)]/60 ${
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]/25 ring-1 ring-[var(--accent)]"
                      : ""
                  }`}
                >
                  <CardHeader className="space-y-1.5 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="default" className="tabular-nums">
                        {ws.currencyCode}
                      </Badge>
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent)]">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="text-[11px] text-[var(--muted-foreground)]">
                          {ws.typeName}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-sm font-semibold">
                      {ws.name}
                    </div>
                    <div className="text-base font-semibold tabular-nums">
                      {formatMoney(ws.balance, ws.currencyCode)}
                    </div>
                  </CardHeader>
                </Card>
              );
            })
          )}
        </div>
      </section>

      {/* KPI Metric Cards: Strictly Scoped to Active Account */}
      {isLoadingSummary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="p-5 space-y-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-7 w-28 my-1" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : user && summary && summary.scopedAccount && activeWorkspace ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="p-5">
              <CardDescription>
                {activeWorkspace.name} Balance
              </CardDescription>
              <CardTitle className="text-xl tabular-nums">
                {formatMoney(
                  summary.scopedAccount.balance,
                  summary.scopedAccount.currencyCode
                )}
              </CardTitle>
              <p className="text-xs text-[var(--muted-foreground)]">
                {summary.scopedAccount.typeName} ({summary.scopedAccount.currencyCode})
              </p>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="p-5">
              <CardDescription>
                Monthly Income
              </CardDescription>
              <CardTitle className="text-xl text-[var(--accent)] tabular-nums">
                +
                {formatMoney(
                  summary.scopedAccount.monthlyIncome,
                  summary.scopedAccount.currencyCode
                )}
              </CardTitle>
              <p className="text-xs text-[var(--muted-foreground)]">
                Inflow to {activeWorkspace.name}
              </p>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="p-5">
              <CardDescription>
                Monthly Spending
              </CardDescription>
              <CardTitle className="text-xl text-[var(--danger)] tabular-nums">
                -
                {formatMoney(
                  summary.scopedAccount.monthlyExpense,
                  summary.scopedAccount.currencyCode
                )}
              </CardTitle>
              <p className="text-xs text-[var(--muted-foreground)]">
                Outflow from {activeWorkspace.name}
              </p>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="p-5">
              <CardDescription>Net Cash Flow</CardDescription>
              <CardTitle
                className={`text-xl tabular-nums ${
                  summary.scopedAccount.monthlyNetCashFlow >= 0
                    ? "text-[var(--accent)]"
                    : "text-[var(--danger)]"
                }`}
              >
                {summary.scopedAccount.monthlyNetCashFlow >= 0 ? "+" : ""}
                {formatMoney(
                  summary.scopedAccount.monthlyNetCashFlow,
                  summary.scopedAccount.currencyCode
                )}
              </CardTitle>
              <p className="text-xs text-[var(--muted-foreground)]">
                Transfers: {formatMoney(summary.scopedAccount.monthlyTransfersVolume, summary.scopedAccount.currencyCode)}
              </p>
            </CardHeader>
          </Card>
        </div>
      ) : null}

          <section className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <DataTableShell
                title={
                  activeWorkspace
                    ? `Recent Activity in ${activeWorkspace.name}`
                    : "Recent Activity"
                }
                description={
                  activeWorkspace
                    ? `Latest transactions scoped to ${activeWorkspace.name} (${activeWorkspace.currencyCode}).`
                    : "Latest deposits, expenses, and account transfers."
                }
                actions={
                  <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                    <Link href="/transactions">
                      View All <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                }
                isLoading={isLoadingSummary}
                loadingColumns={3}
                loadingRows={5}
                isEmpty={visibleRecentTransactions.length === 0}
                emptyTitle="No transactions recorded yet"
                emptyDescription="Record an income, expense, or transfer funds between accounts."
                emptyIcon={
                  <ArrowLeftRight className="h-4 w-4 text-[var(--muted-foreground)] mt-0.5" />
                }
                emptyAction={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openCreateTransactionDialog()}
                    className="gap-1.5 shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Transaction
                  </Button>
                }
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Account &amp; Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRecentTransactions.map((tx) => {
                      const isCrossCurrencyTransfer =
                        tx.type === TransactionType.Transfer &&
                        tx.destinationCurrencyCode &&
                        tx.destinationCurrencyCode !== tx.currencyCode &&
                        tx.destinationAmount;

                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="tabular-nums text-xs">
                            <div className="font-medium text-[var(--foreground)]">
                              {formatTableDate(tx.occurredOn)}
                            </div>
                            {tx.createdAtUtc && (
                              <div
                                className="text-[11px] text-[var(--muted-foreground)]"
                                title={`Recorded at ${new Date(tx.createdAtUtc).toLocaleString()}`}
                              >
                                {formatRecordedTime(tx.createdAtUtc)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {tx.description}
                            </div>
                            <div className="text-xs text-[var(--muted-foreground)]">
                              {tx.accountName}
                              {tx.destinationAccountName
                                ? ` → ${tx.destinationAccountName}`
                                : ""}
                            </div>
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold tabular-nums ${
                              tx.type === TransactionType.Income
                                ? "text-[var(--accent)]"
                                : tx.type === TransactionType.Expense
                                  ? "text-[var(--danger)]"
                                  : ""
                            }`}
                          >
                            <div>
                              {formatMoney(tx.amount, tx.currencyCode)}
                            </div>
                            {isCrossCurrencyTransfer && (
                              <div className="text-[11px] font-normal text-[var(--accent)]">
                                →{" "}
                                {formatMoney(
                                  tx.destinationAmount!,
                                  tx.destinationCurrencyCode!
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </DataTableShell>
            </div>

            <div className="space-y-6 lg:col-span-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Monthly Budgets</CardTitle>
                    <CardDescription>
                      {activeWorkspace
                        ? `Budgets for ${activeWorkspace.name}`
                        : summary
                          ? `Spending pace for ${summary.year}-${String(summary.month).padStart(2, "0")}`
                          : "Spending pace for current month"}
                    </CardDescription>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/budgets">
                      Manage <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLoadingSummary ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="space-y-2 py-1">
                        <div className="flex justify-between">
                          <Skeleton className="h-3.5 w-24" />
                          <Skeleton className="h-3.5 w-28" />
                        </div>
                        <Skeleton className="h-2 w-full rounded-full" />
                      </div>
                    ))
                  ) : !summary || summary.budgets.length === 0 ? (
                    <Alert variant="muted">
                      <AlertTitle>No monthly budgets set yet</AlertTitle>
                      <AlertDescription>
                        Set monthly category limits in Budgets to track your
                        spending pace.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    summary.budgets.map((b) => (
                      <div key={b.id} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{b.categoryName}</span>
                          <span className="tabular-nums text-[var(--muted-foreground)]">
                            {formatMoney(b.spentAmount, b.currencyCode)} /{" "}
                            {formatMoney(b.limitAmount, b.currencyCode)}
                          </span>
                        </div>
                        <Progress
                          value={b.utilizationPercent}
                          indicatorClassName={
                            b.isOverBudget
                              ? "bg-[var(--danger)]"
                              : "bg-[var(--accent)]"
                          }
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Savings Goals</CardTitle>
                    <CardDescription>
                      {activeWorkspace
                        ? `Goals linked to ${activeWorkspace.name}`
                        : "Progress toward your future plans"}
                    </CardDescription>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/savings">
                      View Goals <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLoadingSummary ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="space-y-2 py-1">
                        <div className="flex justify-between">
                          <Skeleton className="h-3.5 w-28" />
                          <Skeleton className="h-3.5 w-24" />
                        </div>
                        <Skeleton className="h-2 w-full rounded-full" />
                      </div>
                    ))
                  ) : !summary || summary.savingsGoals.length === 0 ? (
                    <Alert variant="muted">
                      <PiggyBank className="h-4 w-4" />
                      <AlertTitle>No savings goals yet</AlertTitle>
                      <AlertDescription>
                        Create a goal in Savings Goals to start setting money
                        aside.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    summary.savingsGoals.map((g) => (
                      <div key={g.id} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{g.name}</span>
                          <span className="tabular-nums text-[var(--muted-foreground)]">
                            {formatMoney(g.currentAmount, g.currencyCode)} /{" "}
                            {formatMoney(g.targetAmount, g.currencyCode)}
                          </span>
                        </div>
                        <Progress value={g.progressPercent} />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
    </div>
  );
}
