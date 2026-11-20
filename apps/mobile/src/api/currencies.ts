import { apiClient } from "./client";
import { ExchangeRatesResponse } from "@/types/api";
import { setLiveUnitsPerUsd } from "@/utils/currency";

export const currenciesApi = {
  async getRates(refresh = false): Promise<ExchangeRatesResponse> {
    const query = refresh ? "?refresh=true" : "";
    const res = await apiClient<ExchangeRatesResponse>(
      `/api/v1/currencies/rates${query}`
    );
    if (res?.unitsPerUsd) {
      setLiveUnitsPerUsd(res.unitsPerUsd);
    }
    return res;
  },
};
