"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  MoreHorizontal,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { formatRecordedTime, formatTableDate } from "@/lib/utils/date";
import { formatMoney } from "@/lib/utils/currency";
import { toast } from "@/components/ui/toast";
import { useCurrentUser } from "@/hooks/use-auth";
import { useWorkspace } from "@/context/workspace-context";
import {
  DataTableSearch,
  DataTableShell,
  DataTableToolbar,
} from "@/components/shared/data-table";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import {
  TransactionType,
  type PagedTransactionsResponse,
} from "@/types/api";
import { AuthRequiredBanner } from "@/components/shared/auth-required-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const TRANSACTIONS_QUERY_KEY = ["transactions"] as const;

export function TransactionsFeatureView() {
  const { data: user, isLoading: isAuthLoading } = useCurrentUser();
  const { workspaces, activeWorkspace, openCreateTransactionDialog } =
    useWorkspace();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlSearch = searchParams.get("search") || "";
  const urlFilter = searchParams.get("filter") || "all";
  const urlPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const urlAccount = searchParams.get("account") || "all";

  const scopedAccount =
    urlAccount !== "all"
      ? workspaces.find((w) => w.id === urlAccount) ?? null
      : null;

  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const pageSize = 10;

  // Keep local search input synchronized if URL search parameter changes externally
  useEffect(() => {
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  const updateQueryParams = useCallback(
    (updates: {
      search?: string | null;
      filter?: string | null;
      page?: number | null;
      account?: string | null;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.search !== undefined) {
        if (updates.search && updates.search.trim()) {
          params.set("search", updates.search.trim());
        } else {
          params.delete("search");
        }
      }

      if (updates.filter !== undefined) {
        if (updates.filter && updates.filter !== "all") {
          params.set("filter", updates.filter);
        } else {
          params.delete("filter");
        }
      }

      if (updates.page !== undefined) {
        if (updates.page && updates.page > 1) {
          params.set("page", String(updates.page));
        } else {
          params.delete("page");
        }
      }

      if (updates.account !== undefined) {
        if (updates.account && updates.account !== "all") {
          params.set("account", updates.account);
        } else {
          params.delete("account");
        }
      }

      const queryString = params.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(targetUrl, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Debounced search query parameter sync
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== urlSearch) {
        updateQueryParams({ search: searchQuery, page: 1 });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, urlSearch, updateQueryParams]);

  const { data: pagedData, isLoading } = useQuery({
    queryKey: [
      ...TRANSACTIONS_QUERY_KEY,
      "paged",
      urlAccount,
      urlFilter,
      urlSearch,
      urlPage,
    ],
    queryFn: () => {
      const typeNum =
        urlFilter === "expense"
          ? TransactionType.Expense
          : urlFilter === "income"
          ? TransactionType.Income
          : urlFilter === "transfer"
          ? TransactionType.Transfer
          : undefined;

      const params = new URLSearchParams({
        page: String(urlPage),
        pageSize: String(pageSize),
      });

      if (urlAccount && urlAccount !== "all") {
        params.append("accountId", urlAccount);
      }
      if (typeNum !== undefined) {
        params.append("type", String(typeNum));
      }
      if (urlSearch.trim()) {
        params.append("searchTerm", urlSearch.trim());
      }

      return apiClient.get<PagedTransactionsResponse>(
        `/api/v1/transactions/paged?${params.toString()}`
      );
    },
    enabled: Boolean(user),
  });

  const transactions = pagedData?.items ?? [];
  const totalCount = pagedData?.totalCount ?? 0;
  const totalPages = pagedData?.totalPages ?? 1;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/transactions/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Transaction removed and account balance restored.");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Could not remove transaction."
      );
    },
  });

  if (!isAuthLoading && !user) {
    return <AuthRequiredBanner featureName="Transactions" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-2xl font-semibold tracking-tight">
              {scopedAccount ? "Transactions" : "Transaction History"}
            </h2>
            {scopedAccount ? (
              <div className="flex items-center gap-1.5">
                <Badge variant="default" className="text-xs font-medium">
                  For {scopedAccount.name} ({scopedAccount.currencyCode})
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateQueryParams({ account: "all", page: 1 })}
                  className="h-6 px-1.5 text-xs text-[var(--accent)] hover:underline"
                >
                  View all accounts
                </Button>
              </div>
            ) : (
              <Badge variant="neutral" className="text-xs font-normal">
                All accounts (Portfolio-wide)
              </Badge>
            )}
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {scopedAccount
              ? `Record and review transaction activity directly for ${scopedAccount.name} (${scopedAccount.currencyCode}).`
              : "Combined transaction history across all accounts. Every record identifies its owning account."}
          </p>
        </div>

        {scopedAccount ? (
          <Button
            type="button"
            size="sm"
            onClick={() =>
              openCreateTransactionDialog(
                undefined,
                scopedAccount.id,
                true // Locked to this account
              )
            }
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Transaction
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() =>
              openCreateTransactionDialog(
                undefined,
                activeWorkspace?.id,
                true // Locked to active workspace
              )
            }
            className="gap-1.5"
            title={
              activeWorkspace
                ? `Record a transaction in ${activeWorkspace.name}`
                : "Add Transaction"
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Record in {activeWorkspace ? activeWorkspace.name : "Account"}
          </Button>
        )}
      </div>

      {/* Outside Table Toolbar: Search & Filter Tabs */}
      <DataTableToolbar>
        <div className="flex flex-1 items-center gap-2.5 flex-wrap">
          <DataTableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => updateQueryParams({ search: null, page: 1 })}
            placeholder="Search description, notes, or category..."
          />

          {/* Account Scope Switcher */}
          <Select
            value={urlAccount}
            onValueChange={(val) =>
              updateQueryParams({ account: val, page: 1 })
            }
          >
            <SelectTrigger className="h-9 w-[190px] text-xs rounded-xl bg-[var(--surface)] border-[var(--border)] shrink-0">
              <Wallet className="h-3.5 w-3.5 mr-1.5 text-[var(--muted-foreground)] shrink-0" />
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="all">
                <div className="flex items-center gap-2 font-medium">
                  <span>All Accounts</span>
                  <Badge variant="neutral" className="text-[10px] px-1 py-0">
                    Portfolio
                  </Badge>
                </div>
              </SelectItem>
              {workspaces.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[120px]">{acc.name}</span>
                    <Badge
                      variant="default"
                      className="text-[10px] px-1.5 py-0 font-mono"
                    >
                      {acc.currencyCode}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs
          value={urlFilter}
          onValueChange={(val) => {
            updateQueryParams({ filter: val, page: 1 });
          }}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="expense">Expense</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="transfer">Transfer</TabsTrigger>
          </TabsList>
        </Tabs>
      </DataTableToolbar>

      {/* Standardized Reusable DataTableShell */}
      <DataTableShell
        title="Transaction History"
        description="Removing a transaction automatically restores your account balance."
        badge={
          isLoading ? (
            <Skeleton className="h-5 w-8 rounded-full" />
          ) : totalCount > 0 ? (
            <Badge variant="neutral" className="tabular-nums">
              {totalCount}
            </Badge>
          ) : undefined
        }
        isLoading={isLoading}
        loadingColumns={5}
        loadingRows={6}
        isEmpty={transactions.length === 0}
        emptyTitle={
          urlSearch.trim()
            ? "No transactions found"
            : "No transactions in this view"
        }
        emptyDescription={
          urlSearch.trim() ? (
            <div className="flex items-center gap-2 pt-1">
              <span>No transactions matched &ldquo;{urlSearch}&rdquo;.</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs font-semibold underline text-[var(--accent)] hover:bg-transparent"
                onClick={() => {
                  setSearchQuery("");
                  updateQueryParams({ search: null, page: 1 });
                }}
              >
                Reset search
              </Button>
            </div>
          ) : (
            "Record your first income, expense, or account transfer."
          )
        }
        emptyIcon={
          <ArrowLeftRight className="h-4 w-4 text-[var(--muted-foreground)] mt-0.5" />
        }
        emptyAction={
          !urlSearch.trim() ? (
            <Button
              type="button"
              size="sm"
              onClick={() => openCreateTransactionDialog()}
              className="gap-1.5 shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Transaction
            </Button>
          ) : undefined
        }
        pagination={
          totalCount > 0 ? (
            <DataTablePagination
              page={urlPage}
              pageSize={pageSize}
              totalCount={totalCount}
              totalPages={totalPages}
              onPageChange={(newPage) => updateQueryParams({ page: newPage })}
              isLoading={isLoading}
              itemName="transactions"
            />
          ) : undefined
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description &amp; Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-12 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => {
              const isCrossCurrency =
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
                    <div className="font-medium text-[var(--foreground)]">{tx.description}</div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5 text-xs text-[var(--muted-foreground)]">
                      <span className="inline-flex items-center gap-1 rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--foreground)] border border-[var(--border-subtle)]">
                        <Wallet className="h-2.5 w-2.5 text-[var(--muted-foreground)]" />
                        {tx.accountName}
                        {tx.destinationAccountName && (
                          <>
                            <ArrowLeftRight className="h-2.5 w-2.5 text-primary" />
                            <span className="font-semibold text-primary">{tx.destinationAccountName}</span>
                          </>
                        )}
                      </span>
                      {tx.categoryName && <span>· {tx.categoryName}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tx.type === TransactionType.Income
                          ? "default"
                          : tx.type === TransactionType.Transfer
                          ? "neutral"
                          : "warning"
                      }
                    >
                      {isCrossCurrency
                        ? `${tx.currencyCode} → ${tx.destinationCurrencyCode}`
                        : tx.typeName}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold tabular-nums ${
                      tx.type === TransactionType.Income
                        ? "text-[var(--accent)]"
                        : tx.type === TransactionType.Expense
                        ? "text-[var(--danger)]"
                        : "text-[var(--foreground)]"
                    }`}
                  >
                    <div>
                      {tx.type === TransactionType.Income
                        ? "+"
                        : tx.type === TransactionType.Expense
                        ? "-"
                        : ""}
                      {formatMoney(tx.amount, tx.currencyCode)}
                    </div>
                    {isCrossCurrency && (
                      <div className="text-[11px] font-normal text-[var(--accent)]">
                        → +
                        {formatMoney(
                          tx.destinationAmount!,
                          tx.destinationCurrencyCode!
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Actions for ${tx.description}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => deleteMutation.mutate(tx.id)}
                          className="text-[var(--danger)] focus:text-[var(--danger)]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove Transaction
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
