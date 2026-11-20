import { apiClient } from "./client";
import {
  QuickLogPresetDto,
  QuickLogPresetItemInput,
  TransactionType,
} from "@/types/api";

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

export const quickLogPresetsApi = {
  async getByAccount(accountId: string): Promise<QuickLogPresetDto[]> {
    return apiClient<QuickLogPresetDto[]>(
      `/api/v1/quick-log-presets?accountId=${encodeURIComponent(accountId)}`
    );
  },

  async replaceForAccount(
    accountId: string,
    presets: QuickLogPresetItemInput[]
  ): Promise<QuickLogPresetDto[]> {
    return apiClient<QuickLogPresetDto[]>(
      `/api/v1/quick-log-presets/account/${accountId}`,
      {
        method: "PUT",
        body: JSON.stringify({ presets }),
      }
    );
  },

  async create(
    accountId: string,
    preset: QuickLogPresetItemInput
  ): Promise<QuickLogPresetDto> {
    return apiClient<QuickLogPresetDto>("/api/v1/quick-log-presets", {
      method: "POST",
      body: JSON.stringify({ accountId, ...preset }),
    });
  },

  async remove(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/quick-log-presets/${id}`, {
      method: "DELETE",
    });
  },
};
