import { apiClient } from "./client";
import { AuthResponse, UserResponse } from "@/types/api";

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    return apiClient<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async register(fullName: string, email: string, password: string, defaultCurrencyCode = "USD"): Promise<AuthResponse> {
    return apiClient<AuthResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName, email, password, defaultCurrencyCode }),
    });
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
