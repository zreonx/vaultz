import { env } from "@/config/env";
import type { ProblemDetails } from "@/types/api";
import { ApiError } from "./errors";

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
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
