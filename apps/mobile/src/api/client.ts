import { Platform } from "react-native";
import Constants from "expo-constants";
import { secureStore } from "@/security/secureStore";

const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://vaultz-api.zreon.space";

function isTunnelHost(host: string): boolean {
  return (
    host.endsWith(".exp.direct") ||
    host.endsWith(".boltexpo.dev") ||
    host.endsWith(".ngrok.io") ||
    host.endsWith(".ngrok-free.app") ||
    host.endsWith(".tunnel")
  );
}

// Dynamic default API base URL:
// - Web: uses current window hostname if on localhost
// - Native Android / iOS & remote web: defaults directly to live backend https://vaultz-api.zreon.space
function getDefaultBaseUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const host = window.location.hostname || "localhost";
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:5180";
    }
  }

  return DEFAULT_API_URL;
}

let configuredApiBaseUrl = getDefaultBaseUrl();

// Try to load any previously saved custom API base URL from storage
(async () => {
  try {
    const saved = await secureStore.getItemAsync?.("vaultz.custom_api_url");
    if (saved) {
      // Automatically purge stale local/unreachable IPs so users on Android/iOS don't get stuck
      if (
        saved.includes("192.168.") ||
        saved.includes("10.") ||
        saved.includes("172.") ||
        saved.includes("localhost") ||
        saved.includes("127.0.0.1") ||
        saved.startsWith("http://")
      ) {
        await secureStore.deleteItemAsync?.("vaultz.custom_api_url");
        configuredApiBaseUrl = getDefaultBaseUrl();
      } else {
        configuredApiBaseUrl = saved;
      }
    }
  } catch {
    // Ignore storage errors on startup
  }
})();

export function setApiBaseUrl(url: string) {
  if (url) {
    configuredApiBaseUrl = url.replace(/\/+$/, "");
    try {
      void secureStore.setItemAsync?.("vaultz.custom_api_url", configuredApiBaseUrl);
    } catch {
      // Ignore
    }
  }
}

export function resetApiBaseUrl() {
  configuredApiBaseUrl = getDefaultBaseUrl();
  try {
    void secureStore.deleteItemAsync?.("vaultz.custom_api_url");
  } catch {
    // Ignore
  }
  return configuredApiBaseUrl;
}

export function getApiBaseUrl(): string {
  return configuredApiBaseUrl;
}

export interface ApiErrorPayload {
  title?: string;
  detail?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  public status: number;
  public payload?: ApiErrorPayload;

  constructor(message: string, status = 500, payload?: ApiErrorPayload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

let onUnauthorizedCallback: (() => void) | null = null;

export function setOnUnauthorizedCallback(cb: () => void) {
  onUnauthorizedCallback = cb;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<T> {
  const token = await secureStore.getToken();
  const url = `${getApiBaseUrl()}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Fast fail-safe timeout so requests never stall or hang on Android/iOS
  const controller = new AbortController();
  const timeoutMs = options.timeout ?? 10000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(
        `Request to ${endpoint} timed out after ${timeoutMs / 1000}s. Please check connection.`,
        0
      );
    }
    const errorMsg = err instanceof Error ? err.message : "Network request failed";
    throw new ApiError(
      `Cannot connect to Vaultz API at ${getApiBaseUrl()}. Please check connection. (${errorMsg})`,
      0
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.status === 401) {
    const isAuthEndpoint =
      endpoint.includes("/auth/login") ||
      endpoint.includes("/auth/register") ||
      endpoint.includes("/auth/forgot-password");

    if (!isAuthEndpoint) {
      await secureStore.removeToken();
      onUnauthorizedCallback?.();
    }

    const errorPayload = data as ApiErrorPayload | undefined;
    const message =
      errorPayload?.detail ||
      errorPayload?.title ||
      (isAuthEndpoint
        ? "Invalid email or password."
        : "Session expired. Please log in again.");

    throw new ApiError(message, 401, errorPayload);
  }

  if (!response.ok) {
    const errorPayload = data as ApiErrorPayload | undefined;
    let message = errorPayload?.detail || errorPayload?.title || `Request failed with status ${response.status}`;

    if (errorPayload?.errors) {
      const firstError = Object.values(errorPayload.errors).flat()[0];
      if (firstError) message = firstError;
    }

    throw new ApiError(message, response.status, errorPayload);
  }

  return data as T;
}
