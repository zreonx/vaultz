"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeftRight, Globe, Plus, Wallet } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import {
  CURRENCY_METADATA,
  convertReferenceAmount,
  formatMoney,
  getReferenceExchangeRate,
  type SupportedCurrencyCode,
} from "@/lib/utils/currency";
import { useCurrentUser } from "@/hooks/use-auth";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import {
  AccountType,
  TransactionType,
  type AccountResponse,
  type TransactionResponse,
} from "@/types/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "@/components/ui/toast";
import { CreateTransactionDialog } from "@/components/shared/create-transaction-dialog";
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
import { SearchableCurrencySelect } from "@/components/shared/searchable-currency-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STORAGE_KEY = "vaultz.active_account_id";

interface WorkspaceContextValue {
  workspaces: AccountResponse[];
  isLoadingWorkspaces: boolean;
  selectedWorkspaceId: string; // "all" or account.id
  activeWorkspace: AccountResponse | null;
  defaultWorkspace: AccountResponse | null;
  activeCurrencyCode: string;
  setSelectedWorkspaceId: (id: string) => void;
  openCreateWorkspaceDialog: () => void;
  openTransferDialog: (fromWorkspaceId?: string, toWorkspaceId?: string) => void;
  openCreateTransactionDialog: (
    initialType?: TransactionType,
    initialAccountId?: string,
    lockAccount?: boolean
  ) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider.");
  }
  return ctx;
}

function getLocalTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const { data: fxRates } = useExchangeRates();
  const queryClient = useQueryClient();

  const { data: workspaces = [], isLoading: isLoadingWorkspaces } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => apiClient.get<AccountResponse[]>("/api/v1/accounts"),
    enabled: Boolean(user),
  });

  // If user is authenticated but has no accounts, redirect them to complete onboarding
  useEffect(() => {
    if (!isLoadingWorkspaces && user && workspaces.length === 0) {
      router.replace("/onboarding");
    }
  }, [isLoadingWorkspaces, user, workspaces.length, router]);

  const [selectedWorkspaceId, setSelectedWorkspaceIdState] =
    useState<string>("");

  // Load saved account selection (ignoring legacy "all")
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && saved !== "all") {
        setSelectedWorkspaceIdState(saved);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Ensure selectedWorkspaceId always refers to a valid existing account
  useEffect(() => {
    if (!isLoadingWorkspaces && workspaces.length > 0) {
      const exists = workspaces.some((w) => w.id === selectedWorkspaceId);
      if (!exists) {
        const preferredId =
          workspaces.find((w) => w.isDefault)?.id ?? workspaces[0]?.id;
        if (preferredId) {
          setSelectedWorkspaceIdState(preferredId);
          try {
            window.localStorage.setItem(STORAGE_KEY, preferredId);
          } catch {
            // Ignore
          }
        }
      }
    }
  }, [isLoadingWorkspaces, workspaces, selectedWorkspaceId]);

  const setSelectedWorkspaceId = useCallback((id: string) => {
    if (!id || id === "all") return;
    setSelectedWorkspaceIdState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const defaultWorkspace = useMemo(
    () => workspaces.find((w) => w.isDefault) ?? workspaces[0] ?? null,
    [workspaces]
  );

  const activeWorkspace = useMemo(
    () =>
      workspaces.find((w) => w.id === selectedWorkspaceId) ??
      defaultWorkspace ??
      null,
    [selectedWorkspaceId, workspaces, defaultWorkspace]
  );

  const activeCurrencyCode =
    activeWorkspace?.currencyCode ?? user?.defaultCurrencyCode ?? "USD";

  // --- Create New Account Modal State ---
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<number>(AccountType.Checking);
  const [newCurrency, setNewCurrency] = useState<string>("USD");
  const [newInitialBalance, setNewInitialBalance] = useState<string>("0");
  const [newIsDefault, setNewIsDefault] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const openCreateWorkspaceDialog = useCallback(() => {
    setNewName("");
    setNewType(AccountType.Checking);
    setNewCurrency(activeCurrencyCode);
    setNewInitialBalance("0");
    setNewIsDefault(workspaces.length === 0);
    setCreateError(null);
    setIsCreateOpen(true);
  }, [activeCurrencyCode, workspaces.length]);

  const createWorkspaceMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      type: number;
      currencyCode: string;
      initialBalance: number;
      isDefault: boolean;
    }) => apiClient.post<AccountResponse>("/api/v1/accounts", payload),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setSelectedWorkspaceId(created.id);
      setIsCreateOpen(false);
      toast.success(`Account "${created.name}" created successfully!`);
    },
    onError: (err) => {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not create account. Please check your details.";
      setCreateError(msg);
      toast.error(msg);
    },
  });

  const handleCreateSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError(null);

    if (!newName.trim()) {
      setCreateError("Please enter an account name.");
      return;
    }

    createWorkspaceMutation.mutate({
      name: newName.trim(),
      type: newType,
      currencyCode: newCurrency,
      initialBalance: Number(newInitialBalance) || 0,
      isDefault: newIsDefault,
    });
  };

  // --- Create Transaction Modal State ---
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [txInitialType, setTxInitialType] = useState<TransactionType>(
    TransactionType.Expense
  );
  const [txInitialAccountId, setTxInitialAccountId] = useState<string>("");
  const [txLockAccount, setTxLockAccount] = useState<boolean>(false);

  const openCreateTransactionDialog = useCallback(
    (
      initialType?: TransactionType,
      initialAccountId?: string,
      lockAccount: boolean = false
    ) => {
      setTxInitialType(initialType ?? TransactionType.Expense);
      setTxInitialAccountId(
        initialAccountId ?? activeWorkspace?.id ?? workspaces[0]?.id ?? ""
      );
      setTxLockAccount(lockAccount);
      setIsTransactionOpen(true);
    },
    [activeWorkspace, workspaces]
  );

  // --- Transfer Between Accounts Modal State ---
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [fromId, setFromId] = useState<string>("");
  const [toId, setToId] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [destinationAmount, setDestinationAmount] = useState<string>("");
  const [transferDate, setTransferDate] = useState<string>(getLocalTodayIso());
  const [transferDescription, setTransferDescription] = useState<string>(
    "Account Transfer"
  );
  const [transferError, setTransferError] = useState<string | null>(null);

  const openTransferDialog = useCallback(
    (initialFromId?: string, initialToId?: string) => {
      const defaultFrom =
        initialFromId ||
        activeWorkspace?.id ||
        workspaces[0]?.id ||
        "";
      const defaultTo =
        initialToId ||
        workspaces.find((w) => w.id !== defaultFrom)?.id ||
        "";

      setFromId(defaultFrom);
      setToId(defaultTo);
      setTransferAmount("");
      setDestinationAmount("");
      setTransferDate(getLocalTodayIso());
      setTransferDescription("Transfer between accounts");
      setTransferError(null);
      setIsTransferOpen(true);
    },
    [activeWorkspace, workspaces]
  );

  const fromWorkspace = workspaces.find((w) => w.id === fromId);
  const toWorkspace = workspaces.find((w) => w.id === toId);
  const isCrossCurrency =
    Boolean(fromWorkspace) &&
    Boolean(toWorkspace) &&
    fromWorkspace!.currencyCode !== toWorkspace!.currencyCode;

  useEffect(() => {
    const numericAmount = Number(transferAmount) || 0;
    if (isCrossCurrency && fromWorkspace && toWorkspace && numericAmount > 0) {
      const converted = convertReferenceAmount(
        numericAmount,
        fromWorkspace.currencyCode,
        toWorkspace.currencyCode
      );
      setDestinationAmount(String(converted));
    } else if (!isCrossCurrency && numericAmount > 0) {
      setDestinationAmount(String(numericAmount));
    } else {
      setDestinationAmount("");
    }
  }, [transferAmount, isCrossCurrency, fromWorkspace, toWorkspace, fxRates]);

  const transferMutation = useMutation({
    mutationFn: (payload: {
      accountId: string;
      destinationAccountId: string;
      type: number;
      amount: number;
      destinationAmount: number | null;
      occurredOn: string;
      description: string;
    }) => apiClient.post<TransactionResponse>("/api/v1/transactions", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
      setIsTransferOpen(false);
      toast.success("Transfer completed successfully!");
    },
    onError: (err) => {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not complete transfer between accounts.";
      setTransferError(msg);
      toast.error(msg);
    },
  });

  const handleTransferSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setTransferError(null);

    if (!fromId || !toId) {
      setTransferError("Please select both a source and destination account.");
      return;
    }

    if (fromId === toId) {
      setTransferError(
        "Source and destination accounts must be different."
      );
      return;
    }

    const parsedAmount = Number(transferAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      setTransferError("Please enter a transfer amount greater than zero.");
      return;
    }

    const parsedDestAmount = Number(destinationAmount);

    transferMutation.mutate({
      accountId: fromId,
      destinationAccountId: toId,
      type: TransactionType.Transfer,
      amount: parsedAmount,
      destinationAmount:
        isCrossCurrency && parsedDestAmount > 0 ? parsedDestAmount : null,
      occurredOn: transferDate,
      description: transferDescription.trim() || "Account Transfer",
    });
  };

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      isLoadingWorkspaces,
      selectedWorkspaceId,
      activeWorkspace,
      defaultWorkspace,
      activeCurrencyCode,
      setSelectedWorkspaceId,
      openCreateWorkspaceDialog,
      openTransferDialog,
      openCreateTransactionDialog,
    }),
    [
      workspaces,
      isLoadingWorkspaces,
      selectedWorkspaceId,
      activeWorkspace,
      defaultWorkspace,
      activeCurrencyCode,
      setSelectedWorkspaceId,
      openCreateWorkspaceDialog,
      openTransferDialog,
      openCreateTransactionDialog,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}

      {/* Global Dialog 1: Create New Account */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-[var(--accent)]" />
              Add New Account
            </DialogTitle>
            <DialogDescription>
              Each account operates in a single fixed currency. You can create
              as many accounts as you need and transfer between them anytime.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {createError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Could not create account</AlertTitle>
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="global-acc-name">Account Name</Label>
              <Input
                id="global-acc-name"
                placeholder="e.g., Primary Checking, Seoul Savings, Cash Wallet"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="global-acc-type">Account Type</Label>
                <Select
                  value={String(newType)}
                  onValueChange={(v) => setNewType(Number(v))}
                >
                  <SelectTrigger id="global-acc-type" aria-label="Account Type">
                    <SelectValue placeholder="Checking" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(AccountType.Checking)}>
                      Checking
                    </SelectItem>
                    <SelectItem value={String(AccountType.Savings)}>
                      Savings
                    </SelectItem>
                    <SelectItem value={String(AccountType.Cash)}>
                      Cash Wallet
                    </SelectItem>
                    <SelectItem value={String(AccountType.CreditCard)}>
                      Credit Card
                    </SelectItem>
                    <SelectItem value={String(AccountType.Investment)}>
                      Investment
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="global-acc-currency">
                  Account Currency
                </Label>
                <SearchableCurrencySelect
                  id="global-acc-currency"
                  value={newCurrency}
                  onValueChange={setNewCurrency}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="global-acc-balance">
                Starting Balance ({newCurrency})
              </Label>
              <Input
                id="global-acc-balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={newInitialBalance}
                onChange={(e) => setNewInitialBalance(e.target.value)}
              />
              <p className="text-[11px] text-[var(--muted-foreground)]">
                All transactions inside this account will be recorded in{" "}
                <strong>{newCurrency}</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="global-acc-default"
                className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                checked={newIsDefault}
                onChange={(e) => setNewIsDefault(e.target.checked)}
              />
              <Label
                htmlFor="global-acc-default"
                className="cursor-pointer text-xs font-normal text-[var(--muted-foreground)] select-none"
              >
                Set as default account
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createWorkspaceMutation.isPending}
              >
                <Plus className="h-4 w-4" />
                {createWorkspaceMutation.isPending
                  ? "Adding…"
                  : "Add Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Global Dialog 2: Transfer Between Accounts (Same or Different Currency) */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-[var(--accent)]" />
              Transfer Between Accounts
            </DialogTitle>
            <DialogDescription>
              Move funds between any two accounts—whether they share the same
              currency or use different currencies.
            </DialogDescription>
          </DialogHeader>

          {workspaces.length < 2 ? (
            <div className="space-y-4 py-2">
              <Alert variant="muted">
                <Wallet className="h-4 w-4" />
                <AlertTitle>Add a second account to transfer</AlertTitle>
                <AlertDescription>
                  You currently have {workspaces.length} account. Create another
                  account (in the same or a different currency) to transfer money
                  between them.
                </AlertDescription>
              </Alert>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => {
                    setIsTransferOpen(false);
                    openCreateWorkspaceDialog();
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add Another Account
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              {transferError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Could not complete transfer</AlertTitle>
                  <AlertDescription>{transferError}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>From Account</Label>
                  <div className="flex h-9 items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 text-xs">
                    <span className="truncate font-semibold text-[var(--foreground)]">
                      {fromWorkspace?.name} ({fromWorkspace?.currencyCode})
                    </span>
                    <span className="ml-2 shrink-0 text-[11px] tabular-nums text-[var(--muted-foreground)]">
                      {fromWorkspace &&
                        formatMoney(
                          fromWorkspace.balance,
                          fromWorkspace.currencyCode
                        )}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="transfer-to-acc">To Account</Label>
                  <Select value={toId} onValueChange={setToId}>
                    <SelectTrigger
                      id="transfer-to-acc"
                      aria-label="To Account"
                    >
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces
                        .filter((ws) => ws.id !== fromId)
                        .map((ws) => (
                          <SelectItem key={ws.id} value={ws.id}>
                            {ws.name} ({ws.currencyCode} ·{" "}
                            {formatMoney(ws.balance, ws.currencyCode)})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="transfer-amount">
                    Amount Sent{" "}
                    {fromWorkspace ? `(${fromWorkspace.currencyCode})` : ""}
                  </Label>
                  <Input
                    id="transfer-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="transfer-date">Date</Label>
                  <DatePicker
                    id="transfer-date"
                    aria-label="Transfer Date"
                    value={transferDate}
                    onChange={setTransferDate}
                  />
                </div>
              </div>

              {fromWorkspace && toWorkspace && (
                <Alert variant="muted">
                  <Globe className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between text-xs">
                    <span>
                      {isCrossCurrency
                        ? `Cross-Currency Transfer (${fromWorkspace.currencyCode} → ${toWorkspace.currencyCode})`
                        : `Same-Currency Transfer (${fromWorkspace.currencyCode})`}
                    </span>
                    <Badge variant="default" className="tabular-nums">
                      1 {fromWorkspace.currencyCode} ={" "}
                      {getReferenceExchangeRate(
                        fromWorkspace.currencyCode,
                        toWorkspace.currencyCode
                      )}{" "}
                      {toWorkspace.currencyCode}
                    </Badge>
                  </AlertTitle>
                  {isCrossCurrency ? (
                    <AlertDescription className="mt-2 space-y-2">
                      <p>
                        Converted using{" "}
                        {fxRates?.isLiveFeedActive
                          ? "live market exchange rates"
                          : "reference exchange rates"}
                        . You can adjust the exact amount received in{" "}
                        <strong>{toWorkspace.name}</strong> below:
                      </p>
                      <div className="space-y-1">
                        <Label
                          htmlFor="transfer-dest-amount"
                          className="text-[11px]"
                        >
                          Amount Received in {toWorkspace.name} (
                          {toWorkspace.currencyCode})
                        </Label>
                        <Input
                          id="transfer-dest-amount"
                          type="number"
                          step="0.01"
                          className="h-8 text-xs tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          value={destinationAmount}
                          onChange={(e) => setDestinationAmount(e.target.value)}
                        />
                      </div>
                    </AlertDescription>
                  ) : (
                    <AlertDescription className="mt-1">
                      Both accounts use{" "}
                      <strong>
                        {fromWorkspace.currencyCode} (
                        {
                          CURRENCY_METADATA[
                            fromWorkspace.currencyCode as SupportedCurrencyCode
                          ]?.name ?? fromWorkspace.currencyCode
                        }
                        )
                      </strong>
                      , so the exact same amount will be credited to{" "}
                      <strong>{toWorkspace.name}</strong>.
                    </AlertDescription>
                  )}
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="transfer-desc">Note / Description</Label>
                <Input
                  id="transfer-desc"
                  placeholder="Transfer between accounts"
                  value={transferDescription}
                  onChange={(e) => setTransferDescription(e.target.value)}
                  required
                />
              </div>

              {toWorkspace && (
                <div className="rounded-xl border-2 border-primary/50 bg-primary/10 p-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-primary">
                    <span>Destination Account</span>
                    <Badge variant="default" className="font-mono text-[10px]">
                      {toWorkspace.currencyCode}
                    </Badge>
                  </div>
                  <div className="text-sm font-bold text-[var(--foreground)]">
                    {toWorkspace.name}
                  </div>
                  <div className="text-[11px] text-[var(--muted-foreground)]">
                    Funds will be deposited directly into <strong>{toWorkspace.name}</strong>.
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTransferOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={transferMutation.isPending}>
                  <ArrowLeftRight className="h-4 w-4" />
                  {transferMutation.isPending
                    ? "Transferring…"
                    : "Complete Transfer"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* Global Dialog 3: Create Transaction */}
      <CreateTransactionDialog
        open={isTransactionOpen}
        onOpenChange={setIsTransactionOpen}
        defaultAccountId={txInitialAccountId}
        defaultType={txInitialType}
        lockAccount={txLockAccount}
      />
    </WorkspaceContext.Provider>
  );
}
