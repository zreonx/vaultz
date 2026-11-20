import { apiClient } from "./client";
import { AuthResponse, UserResponse } from "@/types/api";

function mapAuthResult(raw: any, fallbackCurrency = "USD"): AuthResponse {
  const token = raw?.accessToken || raw?.token || "";
  return {
    token,
    requiresTwoFactor: Boolean(raw?.requiresTwoFactor),
    twoFactorType: raw?.twoFactorType ?? null,
    twoFactorToken: raw?.twoFactorToken ?? null,
    user: {
      id: raw?.id || "",
      email: raw?.email || "",
      fullName: raw?.fullName || "",
      defaultCurrencyCode: raw?.defaultCurrencyCode || fallbackCurrency,
      createdAtUtc: raw?.createdAtUtc || raw?.expiresAtUtc || new Date().toISOString(),
      isEmailVerified: raw?.isEmailVerified ?? true,
    },
  };
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const raw = await apiClient<any>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return mapAuthResult(raw);
  },

  async verifyTwoFactor(
    email: string,
    code: string,
    twoFactorToken: string,
    isRecoveryCode = false
  ): Promise<AuthResponse> {
    const raw = await apiClient<any>("/api/v1/auth/verify-2fa", {
      method: "POST",
      body: JSON.stringify({ email, code, twoFactorToken, isRecoveryCode }),
    });
    return mapAuthResult(raw);
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
    return mapAuthResult(raw, defaultCurrencyCode);
  },

  async getCurrentUser(): Promise<UserResponse | null> {
    const user = await apiClient<UserResponse | undefined>("/api/v1/auth/me");
    if (!user || !user.id) {
      return null;
    }
    return user;
  },

  async updateProfile(
    fullName: string,
    defaultCurrencyCode: string
  ): Promise<AuthResponse> {
    const raw = await apiClient<any>("/api/v1/auth/profile", {
      method: "PUT",
      body: JSON.stringify({ fullName: fullName.trim(), defaultCurrencyCode }),
    });
    return mapAuthResult(raw, defaultCurrencyCode);
  },

  async updateDefaultCurrency(defaultCurrencyCode: string): Promise<AuthResponse> {
    const raw = await apiClient<any>("/api/v1/auth/currency", {
      method: "PUT",
      body: JSON.stringify({ defaultCurrencyCode }),
    });
    return mapAuthResult(raw, defaultCurrencyCode);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResponse> {
    const raw = await apiClient<any>("/api/v1/auth/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return mapAuthResult(raw);
  },

  async logout(): Promise<void> {
    try {
      await apiClient("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    }
  },
};
