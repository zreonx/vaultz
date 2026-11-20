import { env } from "@/config/env";
import type { ProblemDetails } from "@/types/api";
import { ApiError } from "./errors";

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export function getAuthToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)vaultz\.jwt=([^;]*)/);
  const token = match?.[1];
  return token ? decodeURIComponent(token) : null;
}

export function setAuthToken(token: string, expiresAtUtc?: string) {
  if (typeof document === "undefined") return;
  const expires = expiresAtUtc ? new Date(expiresAtUtc).toUTCString() : "";
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `vaultz.jwt=${encodeURIComponent(token)}; path=/; SameSite=Lax${expires ? `; expires=${expires}` : ""}${secure}`;
}

export function clearAuthToken() {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `vaultz.jwt=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secure}`;
}

/**
 * Centralized, typed HTTP client for communicating with the Vaultz /api/v1 backend.
 * Uses credentials: 'include' for cookie-based auth and parses RFC 9457 ProblemDetails on error.
 */
export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<TResponse> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${env.NEXT_PUBLIC_API_BASE_URL}${normalizedPath}`;

  const headers = new Headers(options.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  // Attach Bearer token header if present in document.cookie for cross-domain auth
  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let serializedBody: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    serializedBody = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: serializedBody,
    credentials: "include",
  });

  if (!response.ok) {
    let problemDetails: ProblemDetails | undefined;
    try {
      problemDetails = (await response.json()) as ProblemDetails;
    } catch {
      problemDetails = undefined;
    }

    if (
      response.status === 401 &&
      typeof window !== "undefined" &&
      !normalizedPath.includes("/auth/login") &&
      !normalizedPath.includes("/auth/register")
    ) {
      clearAuthToken();
      const currentPath = window.location.pathname;
      const isPublicPage =
        currentPath === "/" ||
        currentPath.startsWith("/login") ||
        currentPath.startsWith("/register");

      if (!isPublicPage) {
        const target =
          currentPath && currentPath !== "/dashboard"
            ? `/login?redirect=${encodeURIComponent(currentPath)}`
            : "/login";
        window.location.replace(target);
      }
    }

    const message =
      problemDetails?.detail ||
      problemDetails?.title ||
      `Request failed with HTTP status ${response.status}`;

    throw new ApiError(message, response.status, problemDetails);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export const apiClient = {
  get: <TResponse>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<TResponse>(path, { ...options, method: "GET" }),
  post: <TResponse>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<TResponse>(path, { ...options, method: "POST", body }),
  put: <TResponse>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<TResponse>(path, { ...options, method: "PUT", body }),
  delete: <TResponse>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<TResponse>(path, { ...options, method: "DELETE" }),
};
