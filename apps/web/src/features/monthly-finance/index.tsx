"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Layers,
  Sparkles,
  Shield,
  Wallet,
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
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountAllocationsPanel } from "@/features/accounts/account-allocations-panel";

export function MonthlyFinanceFeatureView() {
  const { data: user, isLoading: isAuthLoading } = useCurrentUser();
  const { activeWorkspace } = useWorkspace();
  const { data: accounts = [], isLoading: isLoadingAccounts } = useAccounts();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const now = new Date();
  const currentMonthName = now.toLocaleString("default", { month: "long" });
  const currentYear = now.getFullYear();

  // If a specific workspace account is active in the top navbar, use it.
  // Otherwise, fallback to user's selected account or first available account.
  const effectiveAccount = useMemo(() => {
    if (activeWorkspace) return activeWorkspace;
    if (selectedAccountId) {
      const found = accounts.find((a) => a.id === selectedAccountId);
      if (found) return found;
    }
    return accounts[0] ?? null;
  }, [activeWorkspace, selectedAccountId, accounts]);

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
            Discipline-first budgeting: wall off permanent purpose vaults (Tier 1) and partition active monthly spending allowances (Tier 2).
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
      ) : (
        <div className="space-y-6">
          {/* Account Selector Strip (Visible when viewing All Accounts portfolio scope) */}
          {!activeWorkspace && accounts.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] shrink-0 mr-1">
                Select Account:
              </span>
              {accounts.map((acc) => {
                const isSelected = effectiveAccount?.id === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setSelectedAccountId(acc.id)}
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

          {/* 2-Tier Allocation Panel for the Effective Account */}
          {effectiveAccount && (
            <AccountAllocationsPanel
              key={effectiveAccount.id}
              accountId={effectiveAccount.id}
              accountName={effectiveAccount.name}
              currencyCode={effectiveAccount.currencyCode}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Backwards-compatible alias for any legacy imports
export const BudgetsFeatureView = MonthlyFinanceFeatureView;
