"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useCurrentUser } from "@/hooks/use-auth";
import type { CategoryResponse } from "@/types/api";

export const CATEGORIES_QUERY_KEY = ["categories"] as const;

export function useCategories(accountId?: string) {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: accountId ? ["categories", accountId] : CATEGORIES_QUERY_KEY,
    queryFn: () => {
      const url = accountId
        ? `/api/v1/categories?accountId=${accountId}`
        : "/api/v1/categories";
      return apiClient.get<CategoryResponse[]>(url);
    },
    enabled: Boolean(user),
  });
}
