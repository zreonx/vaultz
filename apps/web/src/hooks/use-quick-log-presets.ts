"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { formatMoney } from "@/lib/utils/currency";
import { toast } from "@/components/ui/toast";
import { useCurrentUser } from "@/hooks/use-auth";
import { ACCOUNTS_QUERY_KEY } from "@/hooks/use-accounts";
import { TRANSACTIONS_QUERY_KEY } from "@/components/shared/create-transaction-dialog";
import {
  TransactionType,
  type QuickLogPresetItemInput,
  type QuickLogPresetResponse,
  type TransactionResponse,
} from "@/types/api";

export const QUICK_LOG_PRESETS_QUERY_KEY = ["quick-log-presets"] as const;

export interface StarterQuickLogPreset {
  key: string;
  label: string;
  amount: number;
  type: TransactionType;
  icon: string;
  colorHex: string;
}

function resolveStarterAmounts(currencyCode: string): [number, number, number, number] {
  switch (currencyCode.toUpperCase()) {
    case "PHP":
      return [150, 250, 100, 500];
    case "JPY":
      return [500, 1200, 400, 3000];
    case "KRW":
      return [5000, 12000, 2000, 35000];
    case "IDR":
      return [35000, 60000, 25000, 150000];
    case "VND":
      return [45000, 80000, 30000, 250000];
    case "INR":
      return [150, 300, 100, 800];
    default:
      return [5, 15, 10, 50];
  }
}

/**
 * Returns 4 currency-scaled starter quick-log items shown before a user customizes their presets.
 */
export function getStarterQuickLogPresets(currencyCode: string): StarterQuickLogPreset[] {
  const [coffee, lunch, commute, groceries] = resolveStarterAmounts(currencyCode);
  return [
    {
      key: "starter-coffee",
      label: "Coffee",
      amount: coffee,
      type: TransactionType.Expense,
      icon: "coffee",
      colorHex: "#B87D28",
    },
    {
      key: "starter-lunch",
      label: "Lunch",
      amount: lunch,
      type: TransactionType.Expense,
      icon: "utensils",
      colorHex: "#D97706",
    },
    {
      key: "starter-commute",
      label: "Commute",
      amount: commute,
      type: TransactionType.Expense,
      icon: "car",
      colorHex: "#2563EB",
    },
    {
      key: "starter-groceries",
      label: "Groceries",
      amount: groceries,
      type: TransactionType.Expense,
      icon: "shopping-bag",
      colorHex: "#2A6B58",
    },
  ];
}

export function getLocalTodayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function useQuickLogPresets(accountId?: string) {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: [...QUICK_LOG_PRESETS_QUERY_KEY, accountId],
    queryFn: () =>
      apiClient.get<QuickLogPresetResponse[]>(
        `/api/v1/quick-log-presets?accountId=${encodeURIComponent(accountId!)}`
      ),
    enabled: Boolean(user && accountId),
  });
}

export function useReplaceQuickLogPresetsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      presets,
    }: {
      accountId: string;
      presets: QuickLogPresetItemInput[];
    }) =>
      apiClient.put<QuickLogPresetResponse[]>(
        `/api/v1/quick-log-presets/account/${accountId}`,
        { presets }
      ),
    onSuccess: (saved, vars) => {
      queryClient.setQueryData([...QUICK_LOG_PRESETS_QUERY_KEY, vars.accountId], saved);
      toast.success("Quick-log shortcuts updated!");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Could not save quick-log shortcuts."
      );
    },
  });
}

export function useQuickLogTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      accountId: string;
      type: TransactionType;
      amount: number;
      description: string;
      categoryId?: string | null;
      budgetSliceId?: string | null;
    }) =>
      apiClient.post<TransactionResponse>("/api/v1/transactions", {
        accountId: payload.accountId,
        destinationAccountId: null,
        categoryId: payload.categoryId ?? null,
        budgetSliceId:
          payload.type === TransactionType.Expense ? (payload.budgetSliceId ?? null) : null,
        accountAllocationId: null,
        type: payload.type,
        amount: payload.amount,
        destinationAmount: null,
        occurredOn: getLocalTodayIsoDate(),
        description: payload.description,
      }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({
        queryKey: ["account-allocations", created.accountId],
      });
      const sign = created.type === TransactionType.Income ? "+" : "-";
      toast.success(
        `Logged ${created.description} (${sign}${formatMoney(created.amount, created.currencyCode)})`
      );
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to log quick transaction."
      );
    },
  });
}
