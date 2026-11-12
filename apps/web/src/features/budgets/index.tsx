"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Target, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import {
  formatMoney,
  CURRENCY_METADATA,
  type SupportedCurrencyCode,
} from "@/lib/utils/currency";
import { useWorkspace } from "@/context/workspace-context";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCategories } from "@/features/categories";
import { CategoryType, type BudgetProgressResponse } from "@/types/api";
import { AuthRequiredBanner } from "@/components/shared/auth-required-banner";
import { CurrencyIcon } from "@/components/shared/currency-icon";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const upsertBudgetSchema = z.object({
  accountId: z.string().optional(),
  categoryId: z.string().min(1, "Select an expense category"),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  limitAmount: z.coerce.number().positive("Limit must be greater than zero"),
  currencyCode: z
    .string()
    .trim()
    .length(3)
    .transform((v) => v.toUpperCase()),
});

type UpsertBudgetFormValues = z.infer<typeof upsertBudgetSchema>;

export function BudgetsFeatureView() {
  const { data: user, isLoading: isAuthLoading } = useCurrentUser();
  const { activeWorkspace, activeCurrencyCode } = useWorkspace();
  const { data: categories = [] } = useCategories();
  const queryClient = useQueryClient();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["budgets", currentYear, currentMonth, activeWorkspace?.id ?? "all"],
    queryFn: () => {
      const url = activeWorkspace?.id
        ? `/api/v1/budgets?year=${currentYear}&month=${currentMonth}&accountId=${activeWorkspace.id}`
        : `/api/v1/budgets?year=${currentYear}&month=${currentMonth}`;
      return apiClient.get<BudgetProgressResponse[]>(url);
    },
    enabled: Boolean(user),
  });

  const upsertMutation = useMutation({
    mutationFn: (values: UpsertBudgetFormValues) =>
      apiClient.post<BudgetProgressResponse>("/api/v1/budgets", {
        ...values,
        accountId: values.accountId || activeWorkspace?.id || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/budgets/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["budgets"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpsertBudgetFormValues>({
    resolver: zodResolver(upsertBudgetSchema),
    defaultValues: {
      accountId: activeWorkspace?.id ?? "",
      categoryId: "",
      year: currentYear,
      month: currentMonth,
      currencyCode: activeCurrencyCode || user?.defaultCurrencyCode || "USD",
      limitAmount: 500,
    },
  });

  const expenseCategories = categories.filter(
    (c) =>
      c.type === CategoryType.Expense &&
      (!activeWorkspace || !c.accountId || c.accountId === activeWorkspace.id)
  );
  const watchedCategoryId = watch("categoryId");

  useEffect(() => {
    const firstCategory = expenseCategories[0];
    if (!watchedCategoryId && firstCategory) {
      setValue("categoryId", firstCategory.id);
    }
  }, [expenseCategories, watchedCategoryId, setValue]);

  useEffect(() => {
    if (activeCurrencyCode) {
      setValue("currencyCode", activeCurrencyCode);
    }
    if (activeWorkspace) {
      setValue("accountId", activeWorkspace.id);
    }
  }, [activeCurrencyCode, activeWorkspace, setValue]);

  if (!isAuthLoading && !user) {
    return <AuthRequiredBanner featureName="Budgets" />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Budgets</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {activeWorkspace
              ? `Monthly spending limits and tracking for ${activeWorkspace.name} (${activeWorkspace.currencyCode}).`
              : "Review and manage monthly spending limits."}
          </p>
        </div>
        <Badge variant="neutral" className="text-xs self-start sm:self-auto tabular-nums">
          {new Date(currentYear, currentMonth - 1).toLocaleString("default", {
            month: "long",
          })}{" "}
          {currentYear}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Set Category Budget</CardTitle>
            <CardDescription>
              Create or update a monthly target for an expense category.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((v) => upsertMutation.mutate(v))}
              className="space-y-4"
              noValidate
            >
              {upsertMutation.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Could not save budget</AlertTitle>
                  <AlertDescription>
                    {upsertMutation.error instanceof Error
                      ? upsertMutation.error.message
                      : "Please check your budget details and try again."}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label>Expense Category</Label>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger aria-label="Expense Category">
                        <SelectValue placeholder="Select category…" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.categoryId && (
                  <p className="text-xs text-[var(--danger)]">
                    {errors.categoryId.message}
                  </p>
                )}
              </div>

              <input type="hidden" {...register("currencyCode")} />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="limitAmount">Monthly Limit</Label>
                  <Badge variant="neutral" className="text-xs font-normal">
                    {activeCurrencyCode} ({CURRENCY_METADATA[activeCurrencyCode as SupportedCurrencyCode]?.symbol ?? activeCurrencyCode})
                  </Badge>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <CurrencyIcon currency={activeCurrencyCode} className="h-4 w-4" />
                  </div>
                  <Input
                    id="limitAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-8 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    {...register("limitAmount")}
                  />
                </div>
                {errors.limitAmount && (
                  <p className="text-xs text-[var(--danger)]">
                    {errors.limitAmount.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={upsertMutation.isPending}
              >
                <Target className="h-4 w-4" />
                {upsertMutation.isPending ? "Saving…" : "Save Monthly Budget"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-7">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="space-y-3.5 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-7 w-7 rounded-lg" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-3.5 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : budgets.length === 0 ? (
            <Alert variant="muted">
              <Target className="h-4 w-4" />
              <AlertTitle>No budgets for this month</AlertTitle>
              <AlertDescription>
                Assign a monthly limit to any expense category to monitor
                utilization.
              </AlertDescription>
            </Alert>
          ) : (
            budgets.map((b) => (
              <Card key={b.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: b.categoryColorHex }}
                      />
                      <span className="text-sm font-semibold">
                        {b.categoryName}
                      </span>
                      {b.accountName && (
                        <Badge variant="neutral" className="text-[11px]">
                          {b.accountName}
                        </Badge>
                      )}
                      <Badge
                        variant={b.isOverBudget ? "danger" : "default"}
                        className="tabular-nums"
                      >
                        {b.utilizationPercent.toFixed(1)}%
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(b.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <Progress
                    value={b.utilizationPercent}
                    indicatorClassName={
                      b.isOverBudget ? "bg-[var(--danger)]" : "bg-[var(--accent)]"
                    }
                  />

                  <div className="flex justify-between text-xs text-[var(--muted-foreground)] tabular-nums">
                    <span>
                      Spent: {formatMoney(b.spentAmount, b.currencyCode)} of{" "}
                      {formatMoney(b.limitAmount, b.currencyCode)}
                    </span>
                    <span>
                      Remaining: {formatMoney(b.remainingAmount, b.currencyCode)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
