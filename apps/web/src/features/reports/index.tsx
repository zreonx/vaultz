"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download } from "lucide-react";
import { env } from "@/config/env";
import { apiClient } from "@/lib/api/client";
import { formatMoney } from "@/lib/utils/currency";
import { useWorkspace } from "@/context/workspace-context";
import { useCurrentUser } from "@/hooks/use-auth";
import type { CashFlowReportResponse } from "@/types/api";
import { AuthRequiredBanner } from "@/components/shared/auth-required-banner";
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
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ReportsFeatureView() {
  const { data: user, isLoading: isAuthLoading } = useCurrentUser();
  const { activeWorkspace, activeCurrencyCode } = useWorkspace();
  const now = new Date();
  const yearStr = String(now.getFullYear());
  const monthStr = String(now.getMonth() + 1).padStart(2, "0");
  const dayStr = String(now.getDate()).padStart(2, "0");
  const firstDayOfMonth = `${yearStr}-${monthStr}-01`;
  const todayIso = `${yearStr}-${monthStr}-${dayStr}`;

  const [fromDate, setFromDate] = useState(firstDayOfMonth);
  const [toDate, setToDate] = useState(todayIso);
  const [currencyCode, setCurrencyCode] = useState(
    activeCurrencyCode || "USD"
  );

  useEffect(() => {
    if (activeCurrencyCode) {
      setCurrencyCode(activeCurrencyCode);
    }
  }, [activeCurrencyCode]);

  const queryUrl = activeWorkspace?.id
    ? `/api/v1/reports/cash-flow?fromDate=${fromDate}&toDate=${toDate}&currencyCode=${currencyCode}&accountId=${activeWorkspace.id}`
    : `/api/v1/reports/cash-flow?fromDate=${fromDate}&toDate=${toDate}&currencyCode=${currencyCode}`;

  const { data: report, isLoading } = useQuery({
    queryKey: [
      "reports",
      "cash-flow",
      fromDate,
      toDate,
      currencyCode,
      activeWorkspace?.id ?? "all",
    ],
    queryFn: () => apiClient.get<CashFlowReportResponse>(queryUrl),
    enabled: Boolean(user),
  });

  if (!isAuthLoading && !user) {
    return <AuthRequiredBanner featureName="Financial Reports" />;
  }

  const csvUrl = activeWorkspace?.id
    ? `${env.NEXT_PUBLIC_API_BASE_URL}/api/v1/reports/transactions.csv?fromDate=${fromDate}&toDate=${toDate}&accountId=${activeWorkspace.id}`
    : `${env.NEXT_PUBLIC_API_BASE_URL}/api/v1/reports/transactions.csv?fromDate=${fromDate}&toDate=${toDate}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Reports</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {activeWorkspace
              ? `Cash flow, spending breakdown, and export for ${activeWorkspace.name} (${activeWorkspace.currencyCode}).`
              : "Review your income, spending by category, savings rate, and export transactions."}
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="gap-1.5 self-start sm:self-auto">
          <a href={csvUrl} download="vaultz-transactions.csv">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </a>
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="report-from">From Date</Label>
            <DatePicker
              id="report-from"
              aria-label="From Date"
              value={fromDate}
              onChange={setFromDate}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-to">To Date</Label>
            <DatePicker
              id="report-to"
              aria-label="To Date"
              value={toDate}
              onChange={setToDate}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <div className="flex h-9 items-center rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 text-xs font-semibold">
              {activeCurrencyCode}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="p-5 space-y-2">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-7 w-28 my-1" />
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-60" />
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
              <div className="space-y-3 pt-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2 py-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="p-5">
                <CardDescription>Total Income</CardDescription>
                <CardTitle className="text-xl text-[var(--accent)] tabular-nums">
                  {formatMoney(report.totalIncome, report.currencyCode)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="p-5">
                <CardDescription>Total Spending</CardDescription>
                <CardTitle className="text-xl text-[var(--danger)] tabular-nums">
                  {formatMoney(report.totalExpense, report.currencyCode)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="p-5">
                <CardDescription>Net Savings</CardDescription>
                <CardTitle className="text-xl tabular-nums">
                  {formatMoney(report.netCashFlow, report.currencyCode)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="p-5">
                <CardDescription>Account Transfers</CardDescription>
                <CardTitle className="text-xl text-[var(--muted-foreground)] tabular-nums">
                  {formatMoney(
                    report.totalTransfersExcluded,
                    report.currencyCode
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>
                Period {report.fromDate} – {report.toDate} · Savings Rate:{" "}
                <Badge variant="default" className="tabular-nums">
                  {report.savingsRatePercent.toFixed(1)}%
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="expenses">
                <TabsList>
                  <TabsTrigger value="expenses">
                    Expenses ({report.expenseByCategory.length})
                  </TabsTrigger>
                  <TabsTrigger value="income">
                    Income ({report.incomeByCategory.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="expenses" className="space-y-3 pt-2">
                  {report.expenseByCategory.length === 0 ? (
                    <Alert variant="muted">
                      <BarChart3 className="h-4 w-4" />
                      <AlertTitle>No expenses in this period</AlertTitle>
                      <AlertDescription>
                        Adjust the date range above or record an expense
                        transaction.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    report.expenseByCategory.map((item) => (
                      <div key={item.categoryName} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">
                            {item.categoryName}
                          </span>
                          <span className="tabular-nums text-[var(--muted-foreground)]">
                            {formatMoney(item.totalAmount, item.currencyCode)} (
                            {item.sharePercent.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={item.sharePercent} />
                      </div>
                    ))
                  )}
                </TabsContent>
                <TabsContent value="income" className="space-y-3 pt-2">
                  {report.incomeByCategory.length === 0 ? (
                    <Alert variant="muted">
                      <BarChart3 className="h-4 w-4" />
                      <AlertTitle>No income in this period</AlertTitle>
                      <AlertDescription>
                        Adjust the date range above or record an income
                        transaction.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    report.incomeByCategory.map((item) => (
                      <div key={item.categoryName} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">
                            {item.categoryName}
                          </span>
                          <span className="tabular-nums text-[var(--muted-foreground)]">
                            {formatMoney(item.totalAmount, item.currencyCode)} (
                            {item.sharePercent.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={item.sharePercent} />
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
