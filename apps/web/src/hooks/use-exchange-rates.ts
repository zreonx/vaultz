"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { setLiveUnitsPerUsd } from "@/lib/utils/currency";
import type { ExchangeRatesResponse } from "@/types/api";

export const EXCHANGE_RATES_QUERY_KEY = ["currencies", "rates"] as const;

export function useExchangeRates() {
  return useQuery({
    queryKey: EXCHANGE_RATES_QUERY_KEY,
    queryFn: async () => {
      const data = await apiClient.get<ExchangeRatesResponse>(
        "/api/v1/currencies/rates"
      );
      setLiveUnitsPerUsd(data.unitsPerUsd);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRefreshExchangeRatesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const data = await apiClient.get<ExchangeRatesResponse>(
        "/api/v1/currencies/rates?refresh=true"
      );
      setLiveUnitsPerUsd(data.unitsPerUsd);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(EXCHANGE_RATES_QUERY_KEY, data);
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
