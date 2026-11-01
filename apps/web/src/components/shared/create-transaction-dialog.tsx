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
  ArrowUpRight,
  Globe,
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
import {
  CategoryType,
  TransactionType,
  type TransactionResponse,
} from "@/types/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
}

export function CreateTransactionDialog({
  open,
  onOpenChange,
  defaultAccountId,
  defaultType = TransactionType.Expense,
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
            Record Transaction
          </DialogTitle>
          <DialogDescription>
            Record income, an expense, or an account-to-account transfer.
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
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                {...register("amount")}
              />
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
                <Input
                  id="tx-dest-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  {...register("destinationAmount")}
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="tx-desc">Description</Label>
            <Input
              id="tx-desc"
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
