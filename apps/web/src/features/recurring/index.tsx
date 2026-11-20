"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarClock,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { formatTableDate } from "@/lib/utils/date";
import { formatMoney } from "@/lib/utils/currency";
import { useWorkspace } from "@/context/workspace-context";
import { useCurrentUser } from "@/hooks/use-auth";
import { useAccounts, ACCOUNTS_QUERY_KEY } from "@/features/accounts";
import { useCategories } from "@/features/categories";
import { TRANSACTIONS_QUERY_KEY } from "@/features/transactions";
import {
  CategoryType,
  RecurrenceFrequency,
  TransactionType,
  type RecurringTransactionResponse,
} from "@/types/api";
import { AuthRequiredBanner } from "@/components/shared/auth-required-banner";
import { DataTableShell } from "@/components/shared/data-table";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const recurringFormSchema = z.object({
  accountId: z.string().min(1, "Select an account"),
  destinationAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.coerce.number(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  description: z.string().trim().min(1, "Description is required").max(200),
  frequency: z.coerce.number(),
  nextOccurrenceDate: z.string().min(1, "Next date is required"),
  isActive: z.boolean().optional(),
});

type RecurringFormValues = z.infer<typeof recurringFormSchema>;

export function RecurringFeatureView() {
  const { data: user, isLoading: isAuthLoading } = useCurrentUser();
  const { activeWorkspace } = useWorkspace();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] =
    useState<RecurringTransactionResponse | null>(null);

  const { data: recurringList = [], isLoading } = useQuery({
    queryKey: ["recurring-transactions", activeWorkspace?.id ?? "all"],
    queryFn: () => {
      const url = activeWorkspace?.id
        ? `/api/v1/recurring-transactions?accountId=${activeWorkspace.id}`
        : "/api/v1/recurring-transactions";
      return apiClient.get<RecurringTransactionResponse[]>(url);
    },
    enabled: Boolean(user),
  });

  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringFormSchema),
    defaultValues: {
      accountId: "",
      destinationAccountId: "",
      categoryId: "none",
      type: TransactionType.Expense,
      frequency: RecurrenceFrequency.Monthly,
      nextOccurrenceDate: todayIso,
      amount: 0,
      description: "",
      isActive: true,
    },
  });

  const watchedAccountId = watch("accountId");
  const watchedType = watch("type");

  useEffect(() => {
    if (activeWorkspace) {
      setValue("accountId", activeWorkspace.id);
      return;
    }
    const firstAccount = accounts[0];
    if (!watchedAccountId && firstAccount) {
      setValue("accountId", firstAccount.id);
    }
  }, [activeWorkspace, accounts, watchedAccountId, setValue]);

  const sourceAccount =
    accounts.find((a) => a.id === watchedAccountId) || activeWorkspace || accounts[0];

  const sameCurrencyDestinations = accounts.filter(
    (a) =>
      a.id !== (sourceAccount?.id ?? "") &&
      a.currencyCode === (sourceAccount?.currencyCode ?? "")
  );

  const filteredCreateCategories = categories.filter((c) => {
    if (c.isArchived || Number(watchedType) === TransactionType.Transfer) return false;
    return Number(watchedType) === TransactionType.Income
      ? c.type === CategoryType.Income
      : c.type === CategoryType.Expense;
  });

  const createMutation = useMutation({
    mutationFn: (values: RecurringFormValues) => {
      const isTransfer = Number(values.type) === TransactionType.Transfer;
      return apiClient.post<RecurringTransactionResponse>(
        "/api/v1/recurring-transactions",
        {
          accountId: values.accountId,
          destinationAccountId:
            isTransfer && values.destinationAccountId
              ? values.destinationAccountId
              : null,
          categoryId:
            !isTransfer && values.categoryId && values.categoryId !== "none"
              ? values.categoryId
              : null,
          type: Number(values.type),
          amount: values.amount,
          description: values.description,
          frequency: Number(values.frequency),
          nextOccurrenceDate: values.nextOccurrenceDate,
        }
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["recurring-transactions"],
      });
      reset({
        accountId: watchedAccountId || accounts[0]?.id || "",
        destinationAccountId: "",
        categoryId: "none",
        type: TransactionType.Expense,
        frequency: RecurrenceFrequency.Monthly,
        nextOccurrenceDate: todayIso,
        amount: 0,
        description: "",
        isActive: true,
      });
    },
  });

  // Edit dialog form
  const {
    register: registerEdit,
    control: controlEdit,
    handleSubmit: handleSubmitEdit,
    watch: watchEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringFormSchema),
    defaultValues: {
      accountId: "",
      destinationAccountId: "",
      categoryId: "none",
      type: TransactionType.Expense,
      frequency: RecurrenceFrequency.Monthly,
      nextOccurrenceDate: todayIso,
      amount: 0,
      description: "",
      isActive: true,
    },
  });

  const watchedEditAccountId = watchEdit("accountId");
  const watchedEditType = watchEdit("type");
  const editSourceAccount = accounts.find((a) => a.id === watchedEditAccountId);
  const editSameCurrencyDestinations = accounts.filter(
    (a) =>
      a.id !== (editSourceAccount?.id ?? "") &&
      a.currencyCode === (editSourceAccount?.currencyCode ?? "")
  );
  const filteredEditCategories = categories.filter((c) => {
    if (c.isArchived || Number(watchedEditType) === TransactionType.Transfer) return false;
    return Number(watchedEditType) === TransactionType.Income
      ? c.type === CategoryType.Income
      : c.type === CategoryType.Expense;
  });

  const openEditDialog = (item: RecurringTransactionResponse) => {
    setEditingItem(item);
    resetEdit({
      accountId: item.accountId,
      destinationAccountId: item.destinationAccountId ?? "",
      categoryId: item.categoryId ?? "none",
      type: item.type,
      amount: item.amount,
      description: item.description,
      frequency: item.frequency,
      nextOccurrenceDate: item.nextOccurrenceDate.slice(0, 10),
      isActive: item.isActive,
    });
  };

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: RecurringFormValues;
    }) => {
      const isTransfer = Number(values.type) === TransactionType.Transfer;
      return apiClient.put<RecurringTransactionResponse>(
        `/api/v1/recurring-transactions/${id}`,
        {
          accountId: values.accountId,
          destinationAccountId:
            isTransfer && values.destinationAccountId
              ? values.destinationAccountId
              : null,
          categoryId:
            !isTransfer && values.categoryId && values.categoryId !== "none"
              ? values.categoryId
              : null,
          type: Number(values.type),
          amount: values.amount,
          description: values.description,
          frequency: Number(values.frequency),
          nextOccurrenceDate: values.nextOccurrenceDate,
          isActive: values.isActive ?? true,
        }
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["recurring-transactions"],
      });
      setEditingItem(null);
    },
  });

  const processMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post<RecurringTransactionResponse>(
        `/api/v1/recurring-transactions/${id}/process`
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["recurring-transactions"],
      });
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/api/v1/recurring-transactions/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["recurring-transactions"],
      });
    },
  });

  if (!isAuthLoading && !user) {
    return <AuthRequiredBanner featureName="Recurring Transactions" />;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Recurring Items</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          {activeWorkspace
            ? `Manage repeating bills, subscriptions, transfers, and paychecks for ${activeWorkspace.name} (${activeWorkspace.currencyCode}).`
            : "Keep track of regular bills, subscriptions, transfers, and recurring income."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>New Recurring Item</CardTitle>
            <CardDescription>
              Set up a repeating bill, subscription, transfer, or paycheck.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((v) => createMutation.mutate(v))}
              className="space-y-4"
              noValidate
            >
              {createMutation.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Could not save recurring item</AlertTitle>
                  <AlertDescription>
                    {createMutation.error instanceof Error
                      ? createMutation.error.message
                      : "Please check your schedule details and try again."}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="rec-desc">Description</Label>
                <Textarea
                  id="rec-desc"
                  rows={2}
                  placeholder="Fiber Internet"
                  {...register("description")}
                />
                {errors.description && (
                  <p className="text-xs text-[var(--danger)]">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {!activeWorkspace && accounts.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Account</Label>
                  <Controller
                    control={control}
                    name="accountId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger aria-label="Account">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name} ({a.currencyCode})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Select
                        value={String(field.value)}
                        onValueChange={(val) => {
                          field.onChange(Number(val));
                          setValue("categoryId", "none");
                        }}
                      >
                        <SelectTrigger aria-label="Type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={String(TransactionType.Expense)}>
                            Expense
                          </SelectItem>
                          <SelectItem value={String(TransactionType.Income)}>
                            Income
                          </SelectItem>
                          <SelectItem value={String(TransactionType.Transfer)}>
                            Transfer
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Frequency</Label>
                  <Controller
                    control={control}
                    name="frequency"
                    render={({ field }) => (
                      <Select
                        value={String(field.value)}
                        onValueChange={(val) => field.onChange(Number(val))}
                      >
                        <SelectTrigger aria-label="Frequency">
                          <SelectValue placeholder="Frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value={String(RecurrenceFrequency.Monthly)}
                          >
                            Monthly
                          </SelectItem>
                          <SelectItem
                            value={String(RecurrenceFrequency.Weekly)}
                          >
                            Weekly
                          </SelectItem>
                          <SelectItem value={String(RecurrenceFrequency.Daily)}>
                            Daily
                          </SelectItem>
                          <SelectItem
                            value={String(RecurrenceFrequency.Yearly)}
                          >
                            Yearly
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {activeWorkspace && <input type="hidden" {...register("accountId")} />}

              {Number(watchedType) === TransactionType.Transfer ? (
                <div className="space-y-1.5">
                  <Label>Destination Account ({sourceAccount?.currencyCode})</Label>
                  {sameCurrencyDestinations.length === 0 ? (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Recurring transfers require another account in{" "}
                      {sourceAccount?.currencyCode || "the same currency"}.
                    </p>
                  ) : (
                    <Controller
                      control={control}
                      name="destinationAccountId"
                      render={({ field }) => (
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger aria-label="Destination Account">
                            <SelectValue placeholder="Select destination account" />
                          </SelectTrigger>
                          <SelectContent>
                            {sameCurrencyDestinations.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name} ({a.currencyCode})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Category (Optional)</Label>
                  <Controller
                    control={control}
                    name="categoryId"
                    render={({ field }) => (
                      <Select
                        value={field.value || "none"}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger aria-label="Category">
                          <SelectValue placeholder="Uncategorized" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Uncategorized</SelectItem>
                          {filteredCreateCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rec-amount">
                    Amount {sourceAccount ? `(${sourceAccount.currencyCode})` : ""}
                  </Label>
                  <Input
                    id="rec-amount"
                    type="number"
                    step="0.01"
                    className="tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    {...register("amount")}
                  />
                  {errors.amount && (
                    <p className="text-xs text-[var(--danger)]">
                      {errors.amount.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nextOccurrenceDate">Next Due Date</Label>
                  <Controller
                    control={control}
                    name="nextOccurrenceDate"
                    render={({ field }) => (
                      <DatePicker
                        id="nextOccurrenceDate"
                        aria-label="Next Occurrence Date"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                <Plus className="h-4 w-4" />
                {createMutation.isPending ? "Saving…" : "Save Recurring Item"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-7">
          <DataTableShell
            title="Upcoming & Repeating Items"
            description="Record an occurrence now, edit its schedule, or pause it anytime."
            badge={
              recurringList.length > 0 ? (
                <Badge variant="neutral" className="tabular-nums">
                  {recurringList.length}
                </Badge>
              ) : undefined
            }
            isLoading={isLoading}
            loadingColumns={5}
            loadingRows={4}
            isEmpty={recurringList.length === 0}
            emptyTitle="No recurring items yet"
            emptyDescription="Add repeating bills, subscriptions, or paychecks on the left."
            emptyIcon={<CalendarClock className="h-4 w-4 text-[var(--muted-foreground)] mt-0.5" />}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurringList.map((r) => (
                  <TableRow
                    key={r.id}
                    className={!r.isActive ? "opacity-65" : undefined}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <span>{r.description}</span>
                        {!r.isActive && (
                          <Badge variant="warning">Paused</Badge>
                        )}
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        {r.type === TransactionType.Transfer &&
                        r.destinationAccountName
                          ? `${r.accountName} -> ${r.destinationAccountName}`
                          : r.accountName}
                        {r.categoryName ? ` · ${r.categoryName}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{r.frequencyName}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-xs text-[var(--muted-foreground)]">
                      {formatTableDate(r.nextOccurrenceDate)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatMoney(r.amount, r.currencyCode)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => processMutation.mutate(r.id)}
                          disabled={processMutation.isPending || !r.isActive}
                        >
                          <Play className="h-3.5 w-3.5" />
                          Record Now
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(r)}
                          aria-label={`Edit ${r.description}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(r.id)}
                          aria-label={`Delete ${r.description}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
        </div>
      </div>

      {/* Edit Recurring Item Dialog */}
      <Dialog
        open={Boolean(editingItem)}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90dvh] flex flex-col p-0 overflow-hidden gap-0">
          <DialogHeader className="px-6 pt-5 pb-3.5 border-b border-[var(--border-subtle)] shrink-0">
            <DialogTitle>Edit Recurring Item</DialogTitle>
            <DialogDescription>
              Update amount, schedule frequency, category, or active status.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmitEdit((values) => {
              if (!editingItem) return;
              updateMutation.mutate({ id: editingItem.id, values });
            })}
            className="flex flex-col flex-1 min-h-0 overflow-hidden"
            noValidate
          >
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
              {updateMutation.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Update Failed</AlertTitle>
                  <AlertDescription>
                    {updateMutation.error instanceof Error
                      ? updateMutation.error.message
                      : "Please check your changes and try again."}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="edit-rec-desc">Description</Label>
                <Input id="edit-rec-desc" {...registerEdit("description")} />
                {editErrors.description && (
                  <p className="text-xs text-[var(--danger)]">
                    {editErrors.description.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Account</Label>
                <Controller
                  control={controlEdit}
                  name="accountId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-label="Edit Account">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} ({a.currencyCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 min-w-0">
                  <Label>Type</Label>
                  <Controller
                    control={controlEdit}
                    name="type"
                    render={({ field }) => (
                      <Select
                        value={String(field.value)}
                        onValueChange={(val) => field.onChange(Number(val))}
                      >
                        <SelectTrigger aria-label="Edit Type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={String(TransactionType.Expense)}>
                            Expense
                          </SelectItem>
                          <SelectItem value={String(TransactionType.Income)}>
                            Income
                          </SelectItem>
                          <SelectItem value={String(TransactionType.Transfer)}>
                            Transfer
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-1.5 min-w-0">
                  <Label>Frequency</Label>
                  <Controller
                    control={controlEdit}
                    name="frequency"
                    render={({ field }) => (
                      <Select
                        value={String(field.value)}
                        onValueChange={(val) => field.onChange(Number(val))}
                      >
                        <SelectTrigger aria-label="Edit Frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={String(RecurrenceFrequency.Daily)}>
                            Daily
                          </SelectItem>
                          <SelectItem value={String(RecurrenceFrequency.Weekly)}>
                            Weekly
                          </SelectItem>
                          <SelectItem value={String(RecurrenceFrequency.Monthly)}>
                            Monthly
                          </SelectItem>
                          <SelectItem value={String(RecurrenceFrequency.Yearly)}>
                            Yearly
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {Number(watchedEditType) === TransactionType.Transfer ? (
                <div className="space-y-1.5">
                  <Label>
                    Destination Account ({editSourceAccount?.currencyCode})
                  </Label>
                  <Controller
                    control={controlEdit}
                    name="destinationAccountId"
                    render={({ field }) => (
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger aria-label="Edit Destination Account">
                          <SelectValue placeholder="Select destination account" />
                        </SelectTrigger>
                        <SelectContent>
                          {editSameCurrencyDestinations.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name} ({a.currencyCode})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Controller
                    control={controlEdit}
                    name="categoryId"
                    render={({ field }) => (
                      <Select
                        value={field.value || "none"}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger aria-label="Edit Category">
                          <SelectValue placeholder="Uncategorized" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Uncategorized</SelectItem>
                          {filteredEditCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 min-w-0">
                  <Label htmlFor="edit-rec-amount">
                    Amount ({editSourceAccount?.currencyCode || "USD"})
                  </Label>
                  <Input
                    id="edit-rec-amount"
                    type="number"
                    step="0.01"
                    className="tabular-nums"
                    {...registerEdit("amount")}
                  />
                  {editErrors.amount && (
                    <p className="text-xs text-[var(--danger)]">
                      {editErrors.amount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 min-w-0">
                  <Label htmlFor="editNextDate">Next Due Date</Label>
                  <Controller
                    control={controlEdit}
                    name="nextOccurrenceDate"
                    render={({ field }) => (
                      <DatePicker
                        id="editNextDate"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/50 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Schedule Active</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Pause to keep the rule without recording new entries
                  </p>
                </div>
                <Controller
                  control={controlEdit}
                  name="isActive"
                  render={({ field }) => (
                    <Switch
                      checked={Boolean(field.value)}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)]/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingItem(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
