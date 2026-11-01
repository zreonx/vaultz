"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarClock,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const createRecurringSchema = z.object({
  accountId: z.string().min(1, "Select an account"),
  categoryId: z.string().optional(),
  type: z.coerce.number(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  description: z.string().trim().min(1, "Description is required").max(200),
  frequency: z.coerce.number(),
  nextOccurrenceDate: z.string().min(1, "Next date is required"),
});

type CreateRecurringFormValues = z.infer<typeof createRecurringSchema>;

export function RecurringFeatureView() {
  const { data: user, isLoading: isAuthLoading } = useCurrentUser();
  const { activeWorkspace } = useWorkspace();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const queryClient = useQueryClient();

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
  } = useForm<CreateRecurringFormValues>({
    resolver: zodResolver(createRecurringSchema),
    defaultValues: {
      accountId: "",
      categoryId: "none",
      type: TransactionType.Expense,
      frequency: RecurrenceFrequency.Monthly,
      nextOccurrenceDate: todayIso,
      amount: 0,
      description: "",
    },
  });

  const watchedAccountId = watch("accountId");

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

  const createMutation = useMutation({
    mutationFn: (values: CreateRecurringFormValues) =>
      apiClient.post<RecurringTransactionResponse>(
        "/api/v1/recurring-transactions",
        {
          accountId: values.accountId,
          destinationAccountId: null,
          categoryId:
            values.categoryId && values.categoryId !== "none"
              ? values.categoryId
              : null,
          type: Number(values.type),
          amount: values.amount,
          description: values.description,
          frequency: Number(values.frequency),
          nextOccurrenceDate: values.nextOccurrenceDate,
        }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["recurring-transactions"],
      });
      reset({
        accountId: watchedAccountId || accounts[0]?.id || "",
        categoryId: "none",
        type: TransactionType.Expense,
        frequency: RecurrenceFrequency.Monthly,
        nextOccurrenceDate: todayIso,
        amount: 0,
        description: "",
      });
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
            ? `Manage repeating bills, subscriptions, and paychecks for ${activeWorkspace.name} (${activeWorkspace.currencyCode}).`
            : "Keep track of regular bills, subscriptions, and recurring income."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>New Recurring Item</CardTitle>
            <CardDescription>
              Set up a repeating bill, subscription, or paycheck.
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
                <Input
                  id="rec-desc"
                  placeholder="Fiber Internet"
                  {...register("description")}
                />
                {errors.description && (
                  <p className="text-xs text-[var(--danger)]">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Select
                        value={String(field.value)}
                        onValueChange={(val) => field.onChange(Number(val))}
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

              <input type="hidden" {...register("accountId")} />

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
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rec-amount">
                    Amount {activeWorkspace ? `(${activeWorkspace.currencyCode})` : ""}
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
            description="Click Record Now when a bill or paycheck occurs to add it to your transactions."
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
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.description}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        {r.accountName}
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
                          disabled={processMutation.isPending}
                        >
                          <Play className="h-3.5 w-3.5" />
                          Record Now
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(r.id)}
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
    </div>
  );
}
