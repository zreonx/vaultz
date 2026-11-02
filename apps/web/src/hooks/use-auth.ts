"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  AuthResultResponse,
  TwoFactorSetupResponse,
  UserProfileResponse,
} from "@/types/api";

export const AUTH_ME_QUERY_KEY = ["auth", "me"] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: async () => {
      try {
        const profile =
          await apiClient.get<UserProfileResponse | null>("/api/v1/auth/me");
        return profile ?? null;
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 60 * 1000,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { email: string; password: string }) =>
      apiClient.post<AuthResultResponse>("/api/v1/auth/login", payload),
    onSuccess: (result) => {
      if (!result.requiresTwoFactor) {
        queryClient.setQueryData(AUTH_ME_QUERY_KEY, result);
        void queryClient.invalidateQueries();
      }
    },
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      email: string;
      password: string;
      fullName: string;
      defaultCurrencyCode: string;
    }) =>
      apiClient.post<AuthResultResponse>("/api/v1/auth/register", payload),
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, user);
      void queryClient.invalidateQueries();
    },
  });
}

export function useVerifyEmailMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { email: string; code: string }) =>
      apiClient.post<AuthResultResponse>("/api/v1/auth/verify-email", payload),
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, user);
      void queryClient.invalidateQueries();
    },
  });
}

export function useResendVerificationMutation() {
  return useMutation({
    mutationFn: (payload: { email: string }) =>
      apiClient.post<{ message: string }>("/api/v1/auth/resend-verification", payload),
  });
}

export function useVerifyTwoFactorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      email: string;
      code: string;
      twoFactorToken: string;
      isRecoveryCode?: boolean;
    }) =>
      apiClient.post<AuthResultResponse>("/api/v1/auth/verify-2fa", payload),
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, user);
      void queryClient.invalidateQueries();
    },
  });
}

export function useSetupTwoFactorMutation() {
  return useMutation({
    mutationFn: () =>
      apiClient.post<TwoFactorSetupResponse>("/api/v1/auth/2fa/setup"),
  });
}

export function useConfirmTwoFactorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      secretKey: string;
      code: string;
      recoveryCodes: string[];
      type?: string;
    }) =>
      apiClient.post<AuthResultResponse>("/api/v1/auth/2fa/confirm", payload),
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, user);
      void queryClient.invalidateQueries();
    },
  });
}

export function useDisableTwoFactorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { password: string }) =>
      apiClient.post<AuthResultResponse>("/api/v1/auth/2fa/disable", payload),
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, user);
      void queryClient.invalidateQueries();
    },
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (payload: { email: string }) =>
      apiClient.post<{ message: string }>("/api/v1/auth/forgot-password", payload),
  });
}

export function useResetPasswordMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { email: string; token: string; newPassword: string }) =>
      apiClient.post<AuthResultResponse>("/api/v1/auth/reset-password", payload),
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, user);
      void queryClient.invalidateQueries();
    },
  });
}

export function useUpdateDefaultCurrencyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (defaultCurrencyCode: string) =>
      apiClient.put<UserProfileResponse>("/api/v1/auth/currency", {
        defaultCurrencyCode,
      }),
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, user);
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      fullName: string;
      defaultCurrencyCode: string;
    }) => apiClient.put<UserProfileResponse>("/api/v1/auth/profile", payload),
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, user);
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useChangePasswordMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      apiClient.put<UserProfileResponse>("/api/v1/auth/password", payload),
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, user);
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post<void>("/api/v1/auth/logout"),
    onSuccess: () => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, null);
      queryClient.clear();
      window.location.href = "/login";
    },
  });
}
