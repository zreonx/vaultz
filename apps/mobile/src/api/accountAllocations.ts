import { apiClient } from "./client";
import {
  AccountAllocationDto,
  AccountAllocationsOverviewResponse,
  AllocationCategory,
  MonthlyBudgetPlanDto,
} from "@/types/api";

export interface CreateAllocationRequest {
  name: string;
  category: AllocationCategory;
  initialBalance?: number;
  targetAmount?: number | null;
  color?: string | null;
  icon?: string | null;
}

export interface CreateMonthlyPlanRequest {
  year: number;
  month: number;
  totalBudgetAmount: number;
  slices: {
    name: string;
    allocationPercentage: number;
    categoryId?: string | null;
    color?: string | null;
  }[];
}

export interface CoverDeficitRequest {
  fromSliceId: string;
  toSliceId: string;
  amount: number;
}

export const accountAllocationsApi = {
  async getOverview(accountId: string): Promise<AccountAllocationsOverviewResponse> {
    return apiClient<AccountAllocationsOverviewResponse>(
      `/api/v1/accounts/${accountId}/allocations`
    );
  },

  async createAllocation(
    accountId: string,
    data: CreateAllocationRequest
  ): Promise<AccountAllocationDto> {
    return apiClient<AccountAllocationDto>(
      `/api/v1/accounts/${accountId}/allocations`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  async deposit(accountId: string, id: string, amount: number): Promise<void> {
    return apiClient<void>(
      `/api/v1/accounts/${accountId}/allocations/${id}/deposit`,
      {
        method: "POST",
        body: JSON.stringify({ amount }),
      }
    );
  },

  async withdraw(accountId: string, id: string, amount: number): Promise<void> {
    return apiClient<void>(
      `/api/v1/accounts/${accountId}/allocations/${id}/withdraw`,
      {
        method: "POST",
        body: JSON.stringify({ amount }),
      }
    );
  },

  async deleteAllocation(accountId: string, id: string): Promise<void> {
    return apiClient<void>(
      `/api/v1/accounts/${accountId}/allocations/${id}`,
      {
        method: "DELETE",
      }
    );
  },

  async createMonthlyPlan(
    accountId: string,
    data: CreateMonthlyPlanRequest
  ): Promise<MonthlyBudgetPlanDto> {
    return apiClient<MonthlyBudgetPlanDto>(
      `/api/v1/accounts/${accountId}/budget-plans`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  async coverDeficit(
    accountId: string,
    planId: string,
    data: CoverDeficitRequest
  ): Promise<void> {
    return apiClient<void>(
      `/api/v1/accounts/${accountId}/budget-plans/${planId}/cover-deficit`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  async sweepPlan(
    accountId: string,
    planId: string,
    targetAllocationId?: string | null
  ): Promise<void> {
    return apiClient<void>(
      `/api/v1/accounts/${accountId}/budget-plans/${planId}/sweep`,
      {
        method: "POST",
        body: JSON.stringify({ targetAllocationId }),
      }
    );
  },

  async closePlan(accountId: string, planId: string): Promise<void> {
    return apiClient<void>(
      `/api/v1/accounts/${accountId}/budget-plans/${planId}/close`,
      {
        method: "POST",
      }
    );
  },
};
