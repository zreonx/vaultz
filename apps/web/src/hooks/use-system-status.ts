"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { SystemStatusResponse } from "@/types/api";

export const SYSTEM_STATUS_QUERY_KEY = ["system", "status"] as const;

export function useSystemStatus(checkDb = false) {
  return useQuery({
    queryKey: [...SYSTEM_STATUS_QUERY_KEY, { checkDb }],
    queryFn: () =>
      apiClient.get<SystemStatusResponse>(
        `/api/v1/health${checkDb ? "?checkDb=true" : ""}`
      ),
    retry: false,
  });
}
