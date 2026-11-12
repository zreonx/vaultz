"use client";

import Link from "next/link";
import {
  Sparkles,
  Plus,
  Building2,
  Calendar,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-auth";
import { useWorkspace } from "@/context/workspace-context";
import { useAccounts } from "@/hooks/use-accounts";
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
  const { activeWorkspace } = useWorkspace();
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
              Vaults &amp; Budgets
            </Badge>
            {activeWorkspace && (
              <Badge variant="neutral" className="text-xs font-semibold">
                {activeWorkspace.name} ({activeWorkspace.currencyCode})
              </Badge>
            )}
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {activeWorkspace
              ? `Discipline-first budgeting: purpose vaults & monthly spending budgets for ${activeWorkspace.name} (${activeWorkspace.currencyCode}).`
              : "Discipline-first budgeting: wall off protected savings vaults and partition active monthly spending budgets."}
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
        <Card className="border-dashed p-8 text-center">
          <Building2 className="mx-auto h-10 w-10 text-[var(--muted-foreground)] opacity-40 mb-3" />
          <CardTitle className="text-base">No Account Selected</CardTitle>
          <CardDescription className="max-w-md mx-auto mt-1">
            Monthly Finance is scoped to an individual account. Please select an account from the sidebar switcher to view and manage its funds partition and purpose vaults.
          </CardDescription>
        </Card>
      ) : (
        <AccountAllocationsPanel
          key={activeWorkspace.id}
          accountId={activeWorkspace.id}
          accountName={activeWorkspace.name}
          currencyCode={activeWorkspace.currencyCode}
        />
      )}
    </div>
  );
}

// Backwards-compatible alias for any legacy imports
export const BudgetsFeatureView = MonthlyFinanceFeatureView;
