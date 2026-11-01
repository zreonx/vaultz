import { apiClient } from "./client";
import { AuthResponse, UserResponse } from "@/types/api";

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const raw = await apiClient<any>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const token = raw.accessToken || raw.token;
    return {
      token,
      user: {
        id: raw.id,
        email: raw.email,
        fullName: raw.fullName,
        defaultCurrencyCode: raw.defaultCurrencyCode || "USD",
        createdAtUtc: raw.createdAtUtc || raw.expiresAtUtc,
      },
    };
  },

  async register(
    fullName: string,
    email: string,
    password: string,
    defaultCurrencyCode = "USD"
  ): Promise<AuthResponse> {
    const raw = await apiClient<any>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName, email, password, defaultCurrencyCode }),
    });

    const token = raw.accessToken || raw.token;
    return {
      token,
      user: {
        id: raw.id,
        email: raw.email,
        fullName: raw.fullName,
        defaultCurrencyCode: raw.defaultCurrencyCode || defaultCurrencyCode,
        createdAtUtc: raw.createdAtUtc || raw.expiresAtUtc,
      },
    };
  },

  async getCurrentUser(): Promise<UserResponse> {
    return apiClient<UserResponse>("/api/v1/auth/me");
  },

  async logout(): Promise<void> {
    try {
      await apiClient("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    }
  },
};
