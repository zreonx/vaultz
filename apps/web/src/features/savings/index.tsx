"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  PiggyBank,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import {
  formatMoney,
  CURRENCY_METADATA,
  type SupportedCurrencyCode,
} from "@/lib/utils/currency";
import { useWorkspace } from "@/context/workspace-context";
import { useCurrentUser } from "@/hooks/use-auth";
import type { SavingsGoalResponse } from "@/types/api";
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
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

const createGoalSchema = z.object({
  accountId: z.string().optional(),
  name: z.string().trim().min(1, "Goal name is required").max(100),
  targetAmount: z.coerce.number().positive("Target must be greater than zero"),
  initialAmount: z.coerce.number().min(0, "Cannot be negative"),
  currencyCode: z
    .string()
    .trim()
    .length(3)
    .transform((v) => v.toUpperCase()),
  targetDate: z.string().optional(),
});

type CreateGoalFormValues = z.infer<typeof createGoalSchema>;

export function SavingsFeatureView() {
  const { data: user, isLoading: isAuthLoading } = useCurrentUser();
  const { activeWorkspace, activeCurrencyCode } = useWorkspace();
  const queryClient = useQueryClient();
  const [customAmount, setCustomAmount] = useState<string>("250");
  const [adjustingGoalId, setAdjustingGoalId] = useState<string | null>(null);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["savings-goals", activeWorkspace?.id ?? "all"],
    queryFn: () => {
      const url = activeWorkspace?.id
        ? `/api/v1/savings-goals?accountId=${activeWorkspace.id}`
        : "/api/v1/savings-goals";
      return apiClient.get<SavingsGoalResponse[]>(url);
    },
    enabled: Boolean(user),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateGoalFormValues>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: {
      accountId: activeWorkspace?.id ?? "",
      name: "",
      targetAmount: 5000,
      initialAmount: 0,
      currencyCode: activeCurrencyCode || user?.defaultCurrencyCode || "USD",
      targetDate: "",
    },
  });

  useEffect(() => {
    if (activeCurrencyCode) {
      setValue("currencyCode", activeCurrencyCode);
    }
    if (activeWorkspace) {
      setValue("accountId", activeWorkspace.id);
    }
  }, [activeCurrencyCode, activeWorkspace, setValue]);

  const createMutation = useMutation({
    mutationFn: (values: CreateGoalFormValues) =>
      apiClient.post<SavingsGoalResponse>("/api/v1/savings-goals", {
        ...values,
        accountId: values.accountId || activeWorkspace?.id || null,
        targetDate: values.targetDate || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["savings-goals"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      reset({
        accountId: activeWorkspace?.id ?? "",
        name: "",
        targetAmount: 5000,
        initialAmount: 0,
        currencyCode: activeCurrencyCode || user?.defaultCurrencyCode || "USD",
        targetDate: "",
      });
    },
  });

  const adjustMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      amount: number;
      isWithdrawal: boolean;
    }) =>
      apiClient.post<SavingsGoalResponse>(
        `/api/v1/savings-goals/${payload.id}/adjust`,
        {
          amount: payload.amount,
          isWithdrawal: payload.isWithdrawal,
        }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["savings-goals"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setAdjustingGoalId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/savings-goals/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["savings-goals"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (!isAuthLoading && !user) {
    return <AuthRequiredBanner featureName="Savings Goals" />;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Savings Goals</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          {activeWorkspace
            ? `Plan and track milestone targets for ${activeWorkspace.name} (${activeWorkspace.currencyCode}).`
            : "Plan ahead for emergency funds, travel, and major milestones."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Create Savings Goal</CardTitle>
            <CardDescription>
              Define a target amount and optional target completion date.
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
                  <AlertTitle>Could not create savings goal</AlertTitle>
                  <AlertDescription>
                    {createMutation.error instanceof Error
                      ? createMutation.error.message
                      : "Please check your goal details and try again."}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="goal-name">Goal Name</Label>
                <Input
                  id="goal-name"
                  placeholder="Emergency Reserve"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-[var(--danger)]">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <input type="hidden" {...register("currencyCode")} />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="targetAmount">Target Amount</Label>
                    <span className="text-[11px] text-[var(--muted-foreground)]">
                      {activeCurrencyCode}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                      <CurrencyIcon currency={activeCurrencyCode} className="h-4 w-4" />
                    </div>
                    <Input
                      id="targetAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-8 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      {...register("targetAmount")}
                    />
                  </div>
                  {errors.targetAmount && (
                    <p className="text-xs text-[var(--danger)]">
                      {errors.targetAmount.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="initialAmount">Starting Saved</Label>
                    <span className="text-[11px] text-[var(--muted-foreground)]">
                      {activeCurrencyCode}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                      <CurrencyIcon currency={activeCurrencyCode} className="h-4 w-4" />
                    </div>
                    <Input
                      id="initialAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-8 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      {...register("initialAmount")}
                    />
                  </div>
                  {errors.initialAmount && (
                    <p className="text-xs text-[var(--danger)]">
                      {errors.initialAmount.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="targetDate">Target Date (Optional)</Label>
                <Controller
                  control={control}
                  name="targetDate"
                  render={({ field }) => (
                    <DatePicker
                      id="targetDate"
                      aria-label="Target Date"
                      placeholder="Pick target date"
                      allowClear
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                <Plus className="h-4 w-4" />
                {createMutation.isPending ? "Creating…" : "Create Savings Goal"}
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
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-12 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3.5 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : goals.length === 0 ? (
            <Alert variant="muted">
              <PiggyBank className="h-4 w-4" />
              <AlertTitle>No savings goals yet</AlertTitle>
              <AlertDescription>
                Create a savings goal on the left to start tracking your
                progress.
              </AlertDescription>
            </Alert>
          ) : (
            goals.map((g) => (
              <Card key={g.id}>
                <CardContent className="space-y-3.5 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{g.name}</span>
                        {g.accountName && (
                          <Badge variant="neutral" className="text-[11px]">
                            {g.accountName}
                          </Badge>
                        )}
                        <Badge variant="default" className="tabular-nums">
                          {g.progressPercent.toFixed(1)}%
                        </Badge>
                      </div>
                      {g.targetDate && (
                        <p className="mt-0.5 text-xs text-[var(--muted-foreground)] tabular-nums">
                          Target date: {g.targetDate}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Dialog
                        open={adjustingGoalId === g.id}
                        onOpenChange={(open) =>
                          setAdjustingGoalId(open ? g.id : null)
                        }
                      >
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline" size="sm">
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            Adjust
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Adjust {g.name}</DialogTitle>
                            <DialogDescription>
                              Add a contribution or record a withdrawal in{" "}
                              {g.currencyCode}.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2 py-2">
                            <Label htmlFor={`adj-${g.id}`}>
                              Amount ({g.currencyCode})
                            </Label>
                            <Input
                              id={`adj-${g.id}`}
                              type="number"
                              step="0.01"
                              value={customAmount}
                              onChange={(e) => setCustomAmount(e.target.value)}
                              className="tabular-nums"
                            />
                          </div>
                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={adjustMutation.isPending}
                              onClick={() =>
                                adjustMutation.mutate({
                                  id: g.id,
                                  amount: Number(customAmount) || 0,
                                  isWithdrawal: true,
                                })
                              }
                            >
                              Withdraw
                            </Button>
                            <Button
                              type="button"
                              disabled={adjustMutation.isPending}
                              onClick={() =>
                                adjustMutation.mutate({
                                  id: g.id,
                                  amount: Number(customAmount) || 0,
                                  isWithdrawal: false,
                                })
                              }
                            >
                              Add +{customAmount} {g.currencyCode}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(g.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <Progress value={g.progressPercent} />

                  <div className="flex justify-between text-xs text-[var(--muted-foreground)] tabular-nums">
                    <span>
                      Saved: {formatMoney(g.currentAmount, g.currencyCode)} of{" "}
                      {formatMoney(g.targetAmount, g.currencyCode)}
                    </span>
                    <span>
                      Remaining:{" "}
                      {formatMoney(g.remainingAmount, g.currencyCode)}
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
