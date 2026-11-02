"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Plus,
  Star,
  Wallet,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { formatMoney } from "@/lib/utils/currency";
import { toast } from "@/components/ui/toast";
import { useWorkspace } from "@/context/workspace-context";
import { useCurrentUser } from "@/hooks/use-auth";
import { type AccountResponse } from "@/types/api";
import { AuthRequiredBanner } from "@/components/shared/auth-required-banner";
import {
  DataTableSearch,
  DataTableShell,
  DataTableToolbar,
} from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ACCOUNTS_QUERY_KEY, useAccounts } from "@/hooks/use-accounts";
export { ACCOUNTS_QUERY_KEY, useAccounts };

export function useSetDefaultAccountMutation() {
  const queryClient = useQueryClient();
  const { setSelectedWorkspaceId } = useWorkspace();

  return useMutation({
    mutationFn: (accountId: string) =>
      apiClient.put<AccountResponse>(`/api/v1/accounts/${accountId}/default`),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setSelectedWorkspaceId(updated.id);
      toast.success(`"${updated.name}" is now your default account!`);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to set default account."
      );
    },
  });
}

export function AccountsFeatureView() {
  const router = useRouter();
  const { data: user, isLoading: isAuthLoading } = useCurrentUser();
  const { data: accounts = [], isLoading } = useAccounts();
  const {
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    openCreateWorkspaceDialog,
    openTransferDialog,
    openCreateTransactionDialog,
  } = useWorkspace();
  const setDefaultMutation = useSetDefaultAccountMutation();
  const [search, setSearch] = useState("");

  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return accounts;
    const q = search.trim().toLowerCase();
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.currencyCode.toLowerCase().includes(q) ||
        a.typeName.toLowerCase().includes(q)
    );
  }, [accounts, search]);

  if (!isAuthLoading && !user) {
    return <AuthRequiredBanner featureName="Accounts" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Accounts</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage your single-currency accounts, track balances, and transfer funds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {accounts.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openTransferDialog()}
              className="gap-1.5"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-[var(--accent)]" />
              Transfer
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={openCreateWorkspaceDialog}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Outside Table Toolbar: Search */}
      {isLoading ? (
        <DataTableToolbar>
          <Skeleton className="h-9 w-64 rounded-xl" />
        </DataTableToolbar>
      ) : accounts.length > 0 ? (
        <DataTableToolbar>
          <DataTableSearch
            value={search}
            onChange={setSearch}
            placeholder="Search account name, currency..."
          />
        </DataTableToolbar>
      ) : null}

      {/* Standardized Reusable DataTableShell */}
      <DataTableShell
        title="All Accounts"
        badge={
          isLoading ? (
            <Skeleton className="h-5 w-8 rounded-full" />
          ) : accounts.length > 0 ? (
            <Badge variant="neutral" className="tabular-nums">
              {filteredAccounts.length}
            </Badge>
          ) : undefined
        }
        description="Every account operates in a single fixed currency with independent balance tracking."
        isLoading={isLoading}
        loadingColumns={5}
        loadingRows={4}
        isEmpty={filteredAccounts.length === 0}
        emptyTitle={search ? "No matching accounts" : "No accounts yet"}
        emptyDescription={
          search
            ? `No accounts matched "${search}".`
            : "Create your first single-currency account to start tracking balances."
        }
        emptyIcon={<Wallet className="h-4 w-4 text-[var(--muted-foreground)] mt-0.5" />}
        emptyAction={
          !search ? (
            <Button
              type="button"
              size="sm"
              onClick={openCreateWorkspaceDialog}
              className="gap-1.5 shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Account
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSearch("")}
              className="text-xs font-semibold text-[var(--accent)]"
            >
              Clear search
            </Button>
          )
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Fixed Currency</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.map((account) => {
              const isActive = selectedWorkspaceId === account.id;
              return (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{account.name}</span>
                      {account.isDefault && (
                        <Badge
                          variant="warning"
                          className="gap-1 text-[11px] font-medium"
                        >
                          <Star className="h-3 w-3 fill-current" />
                          Default
                        </Badge>
                      )}
                      {isActive && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{account.typeName}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="tabular-nums">
                      {account.currencyCode}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatMoney(account.balance, account.currencyCode)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {account.isDefault ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-[var(--muted-foreground)]">
                          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                          Default
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDefaultMutation.mutate(account.id)}
                          disabled={setDefaultMutation.isPending}
                          title="Set as Default Account"
                          className="gap-1 text-xs"
                        >
                          <Star className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                          Set Default
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          openCreateTransactionDialog(undefined, account.id, true)
                        }
                        title={`Record transaction in ${account.name}`}
                        className="gap-1 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Tx
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/transactions?account=${account.id}`)}
                        title={`View transactions for ${account.name}`}
                        className="gap-1 text-xs"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        History
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedWorkspaceId(account.id)}
                      >
                        {isActive ? "Active" : "Switch"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openTransferDialog(account.id)}
                        disabled={accounts.length < 2}
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        Transfer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>
    </div>
  );
}
