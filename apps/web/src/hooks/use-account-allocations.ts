import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { toast } from "@/components/ui/toast";
import { ACCOUNTS_QUERY_KEY } from "@/hooks/use-accounts";
import {
  AccountAllocationDto,
  AccountAllocationsOverviewResponse,
  AllocationCategory,
  MonthlyBudgetPlanDto,
} from "@/types/api";

export function useAccountAllocations(accountId?: string) {
  return useQuery({
    queryKey: ["account-allocations", accountId],
    queryFn: () =>
      apiClient.get<AccountAllocationsOverviewResponse>(
        `/api/v1/accounts/${accountId}/allocations`
      ),
    enabled: Boolean(accountId),
  });
}

export function useCreateAllocationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      data,
    }: {
      accountId: string;
      data: {
        name: string;
        category: AllocationCategory;
        initialBalance?: number;
        targetAmount?: number | null;
        color?: string | null;
        icon?: string | null;
      };
    }) =>
      apiClient.post<AccountAllocationDto>(
        `/api/v1/accounts/${accountId}/allocations`,
        data
      ),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({
        queryKey: ["account-allocations", vars.accountId],
      });
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Purpose allocation created successfully!");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to create allocation."
      );
    },
  });
}

export function useUpdateAllocationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      id,
      data,
    }: {
      accountId: string;
      id: string;
      data: {
        name: string;
        category: AllocationCategory;
        targetAmount?: number | null;
        color?: string | null;
        icon?: string | null;
      };
    }) =>
      apiClient.put<AccountAllocationDto>(
        `/api/v1/accounts/${accountId}/allocations/${id}`,
        data
      ),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({
        queryKey: ["account-allocations", vars.accountId],
      });
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      toast.success("Allocation updated successfully!");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to update allocation."
      );
    },
  });
}

export function useDeleteAllocationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      id,
    }: {
      accountId: string;
      id: string;
    }) =>
      apiClient.delete(`/api/v1/accounts/${accountId}/allocations/${id}`),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({
        queryKey: ["account-allocations", vars.accountId],
      });
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      toast.success("Allocation deleted and funds returned to unallocated pool.");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete allocation."
      );
    },
  });
}

export function useDepositAllocationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      id,
      amount,
    }: {
      accountId: string;
      id: string;
      amount: number;
    }) =>
      apiClient.post(`/api/v1/accounts/${accountId}/allocations/${id}/deposit`, {
        amount,
      }),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({
        queryKey: ["account-allocations", vars.accountId],
      });
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      toast.success("Funds deposited into allocation vault.");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to deposit into allocation."
      );
    },
  });
}

export function useWithdrawAllocationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      id,
      amount,
    }: {
      accountId: string;
      id: string;
      amount: number;
    }) =>
      apiClient.post(`/api/v1/accounts/${accountId}/allocations/${id}/withdraw`, {
        amount,
      }),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({
        queryKey: ["account-allocations", vars.accountId],
      });
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      toast.success("Funds withdrawn to available pool.");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to withdraw from allocation."
      );
    },
  });
}

export function useCreateMonthlyPlanMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      data,
    }: {
      accountId: string;
      data: {
        year: number;
        month: number;
        totalBudgetAmount: number;
        slices: {
          name: string;
          allocationPercentage: number;
          categoryId?: string | null;
          color?: string | null;
        }[];
      };
    }) =>
      apiClient.post<MonthlyBudgetPlanDto>(
        `/api/v1/accounts/${accountId}/budget-plans`,
        data
      ),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({
        queryKey: ["account-allocations", vars.accountId],
      });
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Monthly logical budget plan activated!");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to create budget plan."
      );
    },
  });
}

export function useCoverSliceDeficitMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      planId,
      data,
    }: {
      accountId: string;
      planId: string;
      data: {
        fromSliceId: string;
        toSliceId: string;
        amount: number;
      };
    }) =>
      apiClient.post(
        `/api/v1/accounts/${accountId}/budget-plans/${planId}/cover-deficit`,
        data
      ),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({
        queryKey: ["account-allocations", vars.accountId],
      });
      toast.success("Deficit covered: funds transferred between slices!");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to cover slice deficit."
      );
    },
  });
}

export function useSweepMonthlyPlanMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      planId,
      targetAllocationId,
    }: {
      accountId: string;
      planId: string;
      targetAllocationId?: string | null;
    }) =>
      apiClient.post(
        `/api/v1/accounts/${accountId}/budget-plans/${planId}/sweep`,
        { targetAllocationId }
      ),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({
        queryKey: ["account-allocations", vars.accountId],
      });
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Unspent allowance swept successfully!");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to sweep unspent funds."
      );
    },
  });
}

export function useCloseMonthlyPlanMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      planId,
    }: {
      accountId: string;
      planId: string;
    }) =>
      apiClient.post(
        `/api/v1/accounts/${accountId}/budget-plans/${planId}/close`
      ),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({
        queryKey: ["account-allocations", vars.accountId],
      });
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      toast.success("Budget plan closed and remaining funds released.");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to close budget plan."
      );
    },
  });
}
