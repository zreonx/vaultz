"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Globe,
  Lock,
  Plus,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import {
  convertReferenceAmount,
  formatMoney,
  getReferenceExchangeRate,
} from "@/lib/utils/currency";
import { toast } from "@/components/ui/toast";
import { useAccounts, ACCOUNTS_QUERY_KEY } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { useAccountAllocations } from "@/hooks/use-account-allocations";
import {
  CategoryType,
  TransactionType,
  type TransactionResponse,
} from "@/types/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CurrencyIcon } from "@/components/shared/currency-icon";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const TRANSACTIONS_QUERY_KEY = ["transactions"] as const;

const createTransactionSchema = z
  .object({
    accountId: z.string().min(1, "Select an account"),
    destinationAccountId: z.string().optional(),
    categoryId: z.string().optional(),
    budgetSliceId: z.string().optional(),
    accountAllocationId: z.string().optional(),
    type: z.coerce.number(),
    amount: z.coerce.number().positive("Amount must be greater than zero"),
    destinationAmount: z.coerce.number().optional(),
    occurredOn: z.string().min(1, "Date is required"),
    description: z.string().trim().min(1, "Description is required").max(200),
  })
  .superRefine((data, ctx) => {
    if (Number(data.type) === TransactionType.Transfer) {
      if (!data.destinationAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["destinationAccountId"],
          message: "Select a destination account",
        });
      } else if (data.destinationAccountId === data.accountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["destinationAccountId"],
          message: "Destination account must be different from source account",
        });
      }
    }
  });

type CreateTransactionFormValues = z.infer<typeof createTransactionSchema>;

function getLocalTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

interface CreateTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAccountId?: string;
  defaultType?: TransactionType;
  lockAccount?: boolean;
}

export function CreateTransactionDialog({
  open,
  onOpenChange,
  defaultAccountId,
  defaultType = TransactionType.Expense,
  lockAccount = false,
}: CreateTransactionDialogProps) {
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { data: fxRates } = useExchangeRates();

  const todayIso = getLocalTodayIso();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateTransactionFormValues>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      accountId: defaultAccountId || "",
      destinationAccountId: "",
      categoryId: "none",
      budgetSliceId: "none",
      accountAllocationId: "none",
      type: defaultType,
      occurredOn: todayIso,
      amount: undefined as unknown as number,
      destinationAmount: undefined as unknown as number,
      description: "",
    },
  });

  const selectedType = Number(watch("type")) as TransactionType;
  const watchedSourceId = watch("accountId");
  const watchedDestId = watch("destinationAccountId");
  const watchedAmount = Number(watch("amount")) || 0;
  const watchedSliceId = watch("budgetSliceId");

  const { data: allocationsOverview } = useAccountAllocations(watchedSourceId);

  // Set default account when dialog opens or accounts load
  useEffect(() => {
    if (open) {
      const preferredId =
        defaultAccountId ||
        accounts.find((a) => a.isDefault)?.id ||
        accounts[0]?.id ||
        "";
      setValue("accountId", preferredId);
      setValue("type", defaultType);
      setValue("occurredOn", getLocalTodayIso());
    }
  }, [open, defaultAccountId, defaultType, accounts, setValue]);

  // Pick a second account when switching to Transfer
  useEffect(() => {
    if (
      selectedType === TransactionType.Transfer &&
      (!watchedDestId || watchedDestId === watchedSourceId) &&
      accounts.length > 1
    ) {
      const other = accounts.find((a) => a.id !== watchedSourceId);
      if (other) {
        setValue("destinationAccountId", other.id);
      }
    }
  }, [selectedType, watchedSourceId, watchedDestId, accounts, setValue]);

  const sourceAccount = accounts.find((a) => a.id === watchedSourceId);
  const destAccount = accounts.find((a) => a.id === watchedDestId);
  const isCrossCurrencyTransfer =
    selectedType === TransactionType.Transfer &&
    Boolean(sourceAccount) &&
    Boolean(destAccount) &&
    sourceAccount!.currencyCode !== destAccount!.currencyCode;

  // Auto-convert destination amount for cross-currency transfers
  useEffect(() => {
    if (
      isCrossCurrencyTransfer &&
      sourceAccount &&
      destAccount &&
      watchedAmount > 0
    ) {
      const converted = convertReferenceAmount(
        watchedAmount,
        sourceAccount.currencyCode,
        destAccount.currencyCode
      );
      setValue("destinationAmount", converted);
    }
  }, [
    isCrossCurrencyTransfer,
    sourceAccount,
    destAccount,
    watchedAmount,
    fxRates,
    setValue,
  ]);

  const createMutation = useMutation({
    mutationFn: (values: CreateTransactionFormValues) =>
      apiClient.post<TransactionResponse>("/api/v1/transactions", {
        accountId: values.accountId,
        destinationAccountId:
          Number(values.type) === TransactionType.Transfer &&
          values.destinationAccountId
            ? values.destinationAccountId
            : null,
        categoryId:
          Number(values.type) !== TransactionType.Transfer &&
          values.categoryId &&
          values.categoryId !== "none"
            ? values.categoryId
            : null,
        budgetSliceId:
          Number(values.type) === TransactionType.Expense &&
          values.budgetSliceId &&
          values.budgetSliceId !== "none"
            ? values.budgetSliceId
            : null,
        accountAllocationId:
          values.accountAllocationId && values.accountAllocationId !== "none"
            ? values.accountAllocationId
            : null,
        type: Number(values.type),
        amount: values.amount,
        destinationAmount:
          Number(values.type) === TransactionType.Transfer &&
          values.destinationAmount &&
          values.destinationAmount > 0
            ? values.destinationAmount
            : null,
        occurredOn: values.occurredOn,
        description: values.description,
      }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({
        queryKey: ["account-allocations", created.accountId],
      });
      onOpenChange(false);
      toast.success(
        `Transaction of ${formatMoney(created.amount, created.currencyCode)} recorded successfully!`
      );
      reset({
        type: selectedType,
        occurredOn: getLocalTodayIso(),
        amount: undefined as unknown as number,
        destinationAmount: undefined as unknown as number,
        description: "",
        accountId: watchedSourceId || accounts[0]?.id || "",
        destinationAccountId: "",
        categoryId: "none",
        budgetSliceId: "none",
        accountAllocationId: "none",
      });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Could not record transaction."
      );
    },
  });

  const availableCategories = categories.filter((c) => {
    if (selectedType === TransactionType.Expense) {
      return (
        c.type === CategoryType.Expense &&
        (!c.accountId || c.accountId === watchedSourceId)
      );
    }
    if (selectedType === TransactionType.Income) {
      return (
        c.type === CategoryType.Income &&
        (!c.accountId || c.accountId === watchedSourceId)
      );
    }
    return false;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-[var(--accent)]" />
            {selectedType === TransactionType.Transfer
              ? "Transfer Funds"
              : lockAccount && sourceAccount
              ? `New Transaction for ${sourceAccount.name}`
              : "Record Transaction"}
          </DialogTitle>
          <DialogDescription>
            {selectedType === TransactionType.Transfer
              ? "Move funds between accounts."
              : lockAccount && sourceAccount
              ? `Recording transaction directly against ${sourceAccount.name} (${sourceAccount.currencyCode}).`
              : "Record income, an expense, or an account-to-account transfer."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((v) => createMutation.mutate(v))}
          className="space-y-4"
          noValidate
        >
          {createMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Could not save transaction</AlertTitle>
              <AlertDescription>
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : "Could not record transaction."}
              </AlertDescription>
            </Alert>
          )}

          {/* Type Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={
                selectedType === TransactionType.Expense ? "default" : "outline"
              }
              size="sm"
              onClick={() => setValue("type", TransactionType.Expense)}
              className="gap-1.5"
            >
              <ArrowDownLeft className="h-3.5 w-3.5 text-red-500" />
              Expense
            </Button>
            <Button
              type="button"
              variant={
                selectedType === TransactionType.Income ? "default" : "outline"
              }
              size="sm"
              onClick={() => setValue("type", TransactionType.Income)}
              className="gap-1.5"
            >
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
              Income
            </Button>
            <Button
              type="button"
              variant={
                selectedType === TransactionType.Transfer
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() => setValue("type", TransactionType.Transfer)}
              disabled={accounts.length < 2}
              className="gap-1.5"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-blue-500" />
              Transfer
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Account Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="tx-account">
                {selectedType === TransactionType.Transfer
                  ? "Transfer From"
                  : "Account"}
              </Label>
              {lockAccount && sourceAccount ? (
                <div className="flex h-9 items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--foreground)] truncate">
                    <Lock className="h-3 w-3 text-[var(--muted-foreground)] shrink-0" />
                    <span className="truncate">{sourceAccount.name}</span>
                  </div>
                  <Badge variant="default" className="font-mono text-[10px] shrink-0">
                    {sourceAccount.currencyCode}
                  </Badge>
                </div>
              ) : (
                <Controller
                  control={control}
                  name="accountId"
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="tx-account">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name} ({acc.currencyCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
              {errors.accountId && (
                <p className="text-xs text-[var(--danger)]">
                  {errors.accountId.message}
                </p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="tx-occurredOn">Date</Label>
              <Controller
                control={control}
                name="occurredOn"
                render={({ field }) => (
                  <DatePicker
                    id="tx-occurredOn"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>

          {/* Transfer Destination */}
          {selectedType === TransactionType.Transfer ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="tx-dest-account">
                  Transfer To (Destination)
                </Label>
                <Controller
                  control={control}
                  name="destinationAccountId"
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="tx-dest-account">
                        <SelectValue placeholder="Select destination account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts
                          .filter((acc) => acc.id !== watchedSourceId)
                          .map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name} ({acc.currencyCode})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.destinationAccountId && (
                  <p className="text-xs text-[var(--danger)]">
                    {errors.destinationAccountId.message}
                  </p>
                )}
              </div>

              {isCrossCurrencyTransfer && sourceAccount && destAccount && (
                <Alert variant="muted" className="space-y-1.5 py-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Globe className="h-3.5 w-3.5 text-[var(--accent)]" />
                    <span>
                      Live FX: 1 {sourceAccount.currencyCode} ={" "}
                      {getReferenceExchangeRate(
                        sourceAccount.currencyCode,
                        destAccount.currencyCode
                      ).toFixed(4)}{" "}
                      {destAccount.currencyCode}
                    </span>
                  </div>
                  <AlertDescription className="text-[11px] leading-tight">
                    The destination amount is automatically converted using live
                    rates.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            /* Category Selector for Income / Expense */
            <div className="space-y-1.5">
              <Label htmlFor="tx-category">Category</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="tx-category">
                      <SelectValue placeholder="Select category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        No Category (Uncategorized)
                      </SelectItem>
                      {availableCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: c.colorHex }}
                            />
                            <span>{c.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Monthly Budget Slice Selector (Tier 2) */}
          {selectedType === TransactionType.Expense &&
            allocationsOverview?.activeBudgetPlan?.slices &&
            allocationsOverview.activeBudgetPlan.slices.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tx-slice" className="text-xs font-semibold">
                    Deduct From Budget Slice (Logical Finance)
                  </Label>
                  <Badge variant="neutral" className="text-[10px] border-indigo-500/30 text-indigo-500">
                    Tier 2 Active Plan
                  </Badge>
                </div>
                <Controller
                  control={control}
                  name="budgetSliceId"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="tx-slice">
                        <SelectValue placeholder="Select budget slice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          General Account Balance (No Slice)
                        </SelectItem>
                        {allocationsOverview.activeBudgetPlan!.slices.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({formatMoney(s.remainingAmount, sourceAccount?.currencyCode || "PHP")} remaining)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {(() => {
                  const selectedSlice = allocationsOverview.activeBudgetPlan!.slices.find(
                    (s) => s.id === watchedSliceId
                  );
                  if (selectedSlice && watchedAmount > selectedSlice.remainingAmount) {
                    return (
                      <p className="text-xs font-medium text-[var(--danger)]">
                        ⚠️ Amount exceeds remaining slice budget ({formatMoney(selectedSlice.remainingAmount, sourceAccount?.currencyCode || "PHP")}). Strict rules will block this transaction unless you cover the deficit first.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

          {/* Income Direct to Vault Selector (Tier 1) */}
          {selectedType === TransactionType.Income &&
            allocationsOverview?.allocations &&
            allocationsOverview.allocations.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="tx-allocation" className="text-xs font-semibold">
                  Direct Deposit to Purpose Vault (Optional)
                </Label>
                <Controller
                  control={control}
                  name="accountAllocationId"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="tx-allocation">
                        <SelectValue placeholder="Deposit destination" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          Available Cash (General Account Balance)
                        </SelectItem>
                        {allocationsOverview.allocations.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            Vault: {a.name} ({a.categoryName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

          {/* Amount Inputs */}
          <div
            className={`grid gap-3 ${
              isCrossCurrencyTransfer ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount">
                Amount ({sourceAccount?.currencyCode ?? "USD"})
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 h-4 w-4 flex items-center justify-center text-[var(--muted-foreground)] pointer-events-none">
                  <CurrencyIcon
                    currency={sourceAccount?.currencyCode ?? "USD"}
                    className="h-4 w-4 text-[var(--muted-foreground)]"
                  />
                </div>
                <Input
                  id="tx-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-9 font-medium tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  {...register("amount")}
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-[var(--danger)]">
                  {errors.amount.message}
                </p>
              )}
            </div>

            {isCrossCurrencyTransfer && (
              <div className="space-y-1.5">
                <Label htmlFor="tx-dest-amount">
                  Destination ({destAccount?.currencyCode})
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-2.5 h-4 w-4 flex items-center justify-center text-[var(--muted-foreground)] pointer-events-none">
                    <CurrencyIcon
                      currency={destAccount?.currencyCode ?? "USD"}
                      className="h-4 w-4 text-[var(--muted-foreground)]"
                    />
                  </div>
                  <Input
                    id="tx-dest-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-9 font-medium tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    {...register("destinationAmount")}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="tx-desc">Description</Label>
            <Textarea
              id="tx-desc"
              rows={2}
              placeholder={
                selectedType === TransactionType.Transfer
                  ? "e.g., Transfer to Savings"
                  : selectedType === TransactionType.Income
                  ? "e.g., Monthly Salary, Dividend"
                  : "e.g., Groceries, Dinner, Fuel"
              }
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-[var(--danger)]">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Prominent Account Scope & Destination Callout before saving */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/70 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              <span>Account Impact Summary</span>
              <Badge
                variant={
                  selectedType === TransactionType.Income
                    ? "default"
                    : selectedType === TransactionType.Transfer
                    ? "neutral"
                    : "warning"
                }
                className="text-[10px] uppercase font-bold"
              >
                {selectedType === TransactionType.Transfer
                  ? "Transfer"
                  : selectedType === TransactionType.Income
                  ? "Income Deposit"
                  : "Expense Debit"}
              </Badge>
            </div>

            {selectedType === TransactionType.Transfer ? (
              <div className="space-y-1.5 pt-0.5">
                <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2 text-xs">
                  {/* Source Account */}
                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-2">
                    <div className="text-[10px] text-[var(--muted-foreground)] font-medium">From Account</div>
                    <div className="font-semibold truncate text-[var(--foreground)]">
                      {sourceAccount?.name || "Select source"}
                    </div>
                    <div className="text-[10px] font-mono text-[var(--muted-foreground)]">
                      {sourceAccount?.currencyCode}
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-primary shrink-0" />

                  {/* Destination Account - PROMINENT */}
                  <div className="rounded-lg border-2 border-primary/60 bg-primary/10 p-2 shadow-sm">
                    <div className="text-[10px] text-primary font-bold uppercase tracking-wider">
                      To Destination
                    </div>
                    <div className="font-bold truncate text-[var(--foreground)] text-sm">
                      {destAccount?.name ? (
                        destAccount.name
                      ) : (
                        <span className="text-red-500 italic">Select Destination</span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono font-semibold text-primary">
                      {destAccount?.currencyCode || "—"}
                    </div>
                  </div>
                </div>

                {destAccount ? (
                  <p className="text-[11px] text-[var(--muted-foreground)] text-center pt-0.5">
                    Funds will be deposited directly into{" "}
                    <strong className="text-[var(--foreground)]">{destAccount.name}</strong>.
                  </p>
                ) : (
                  <p className="text-[11px] text-red-500 font-medium text-center pt-0.5">
                    ⚠️ Select a destination account to complete this transfer.
                  </p>
                )}
              </div>
            ) : selectedType === TransactionType.Income ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-2.5 text-xs">
                <div>
                  <div className="text-[10px] text-[var(--muted-foreground)] font-medium">Target Account (Deposit To)</div>
                  <div className="font-semibold text-sm text-[var(--foreground)]">
                    {sourceAccount?.name || "Select account"}
                  </div>
                </div>
                <Badge variant="default" className="font-mono text-xs">
                  {sourceAccount?.currencyCode}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-2.5 text-xs">
                <div>
                  <div className="text-[10px] text-[var(--muted-foreground)] font-medium">Source Account (Deduct From)</div>
                  <div className="font-semibold text-sm text-[var(--foreground)]">
                    {sourceAccount?.name || "Select account"}
                  </div>
                </div>
                <Badge variant="warning" className="font-mono text-xs">
                  {sourceAccount?.currencyCode}
                </Badge>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              <Plus className="h-4 w-4" />
              {createMutation.isPending
                ? "Recording…"
                : selectedType === TransactionType.Transfer
                ? "Confirm Transfer"
                : "Record Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
