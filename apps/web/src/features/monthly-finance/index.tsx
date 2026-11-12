"use client";

import Link from "next/link";
import {
  Layers,
  Sparkles,
  ArrowRight,
  Plus,
  Building2,
  Calendar,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-auth";
import { useWorkspace } from "@/context/workspace-context";
import { useAccounts } from "@/hooks/use-accounts";
import { formatMoney } from "@/lib/utils/currency";
import { AuthRequiredBanner } from "@/components/shared/auth-required-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountAllocationsPanel } from "@/features/accounts/account-allocations-panel";

export function MonthlyFinanceFeatureView() {
  const { data: user, isLoading: isAuthLoading } = useCurrentUser();
  const { activeWorkspace, setSelectedWorkspaceId } = useWorkspace();
  const { data: accounts = [], isLoading: isLoadingAccounts } = useAccounts();

  const now = new Date();
  const currentMonthName = now.toLocaleString("default", { month: "long" });
  const currentYear = now.getFullYear();

  if (!isAuthLoading && !user) {
    return <AuthRequiredBanner featureName="Monthly Finance" />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">
              Monthly Finance & Funds Partition
            </h2>
            <Badge variant="neutral" className="gap-1 border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="h-3 w-3" />
              2-Tier System
            </Badge>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {activeWorkspace
              ? `Discipline-first budgeting: purpose vaults & monthly allowance slices for ${activeWorkspace.name} (${activeWorkspace.currencyCode}).`
              : "Discipline-first budgeting: wall off permanent purpose vaults (Tier 1) and partition active monthly spending allowances (Tier 2)."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="neutral" className="gap-1.5 py-1 px-3 text-xs font-semibold tabular-nums">
            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
            {currentMonthName} {currentYear}
          </Badge>
        </div>
      </div>

      {isLoadingAccounts ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      ) : accounts.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <Building2 className="mx-auto h-10 w-10 text-[var(--muted-foreground)] opacity-40" />
          <CardTitle className="mt-3 text-base">No Accounts Found</CardTitle>
          <CardDescription className="max-w-md mx-auto mt-1">
            Create your primary financial account (e.g. Checking or Savings) to partition your funds into Purpose Vaults and Monthly Finance.
          </CardDescription>
          <Button asChild size="sm" className="mt-4 gap-1.5">
            <Link href="/accounts">
              <Plus className="h-4 w-4" />
              Create Account
            </Link>
          </Button>
        </Card>
      ) : !activeWorkspace ? (
        /* Prompt user to select an account when currently viewing All Accounts scope */
        <Card className="p-8 text-center border-dashed">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 mb-3">
            <Layers className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg font-semibold">Select an Account</CardTitle>
          <CardDescription className="max-w-md mx-auto mt-1 mb-6">
            Monthly Finance and Purpose Vaults are configured per account. Choose which account you want to partition and manage:
          </CardDescription>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl mx-auto text-left">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => setSelectedWorkspaceId(acc.id)}
                className="group relative flex flex-col justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-indigo-500 hover:shadow-md transition-all text-left"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                      {acc.name}
                    </span>
                    <Badge variant="neutral" className="text-[10px] px-1.5 py-0">
                      {acc.currencyCode}
                    </Badge>
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {acc.typeName}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-xs font-semibold tabular-nums text-[var(--foreground)]">
                    {formatMoney(acc.balance, acc.currencyCode)}
                  </span>
                  <span className="inline-flex items-center text-xs text-indigo-600 dark:text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform">
                    Select <ArrowRight className="h-3 w-3 ml-1" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Account Switcher Strip (if multiple accounts exist) */}
          {accounts.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] shrink-0 mr-1">
                Account:
              </span>
              {accounts.map((acc) => {
                const isSelected = activeWorkspace.id === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setSelectedWorkspaceId(acc.id)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-200 shadow-sm"
                        : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)] text-[var(--foreground)]"
                    }`}
                  >
                    <span className="font-semibold">{acc.name}</span>
                    <span className="text-[11px] tabular-nums opacity-80">
                      ({formatMoney(acc.balance, acc.currencyCode)})
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 2-Tier Allocation Panel for the Active Account */}
          <AccountAllocationsPanel
            key={activeWorkspace.id}
            accountId={activeWorkspace.id}
            accountName={activeWorkspace.name}
            currencyCode={activeWorkspace.currencyCode}
          />
        </div>
      )}
    </div>
  );
}

// Backwards-compatible alias for any legacy imports
export const BudgetsFeatureView = MonthlyFinanceFeatureView;
