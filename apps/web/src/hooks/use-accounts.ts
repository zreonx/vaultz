"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useCurrentUser } from "@/hooks/use-auth";
import type { AccountResponse } from "@/types/api";

export const ACCOUNTS_QUERY_KEY = ["accounts"] as const;

export function useAccounts() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: ACCOUNTS_QUERY_KEY,
    queryFn: () => apiClient.get<AccountResponse[]>("/api/v1/accounts"),
    enabled: Boolean(user),
  });
}
