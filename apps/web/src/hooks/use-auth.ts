"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { UserProfileResponse } from "@/types/api";

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
      apiClient.post<UserProfileResponse>("/api/v1/auth/login", payload),
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, user);
      void queryClient.invalidateQueries();
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
      apiClient.post<UserProfileResponse>("/api/v1/auth/register", payload),
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
      email: string;
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
