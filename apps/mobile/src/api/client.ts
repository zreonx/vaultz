import { Platform } from "react-native";
import Constants from "expo-constants";
import { secureStore } from "@/security/secureStore";

const DEFAULT_LAN_API_URL = "http://192.168.1.40:5180";

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
// - Web: uses current window hostname (e.g. localhost or local IP) with port 5180
// - Native Android / iOS: dynamically detects Metro debugger host IP, or defaults to LAN IP / emulator loopback
function getDefaultBaseUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const host = window.location.hostname || "localhost";
    return `http://${host}:5180`;
  }

  // If running via Expo Go / Metro, use the exact host IP the device used to load the bundle
  // (unless loaded via an Expo/ngrok tunnel, which only forwards port 8081 — fall back to LAN IP for API port 5180)
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any)?.manifest?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (host && host !== "localhost") {
      if (isTunnelHost(host)) {
        return DEFAULT_LAN_API_URL;
      }
      return `http://${host}:5180`;
    }
  }

  if (Platform.OS === "android") {
    return DEFAULT_LAN_API_URL;
  }

  return DEFAULT_LAN_API_URL;
}

let configuredApiBaseUrl = getDefaultBaseUrl();

// Try to load any previously saved custom API base URL from storage
(async () => {
  try {
    const saved = await secureStore.getItemAsync?.("vaultz.custom_api_url");
    if (saved) {
      // Automatically clear outdated subnet IP if router changed from 192.168.254.x to 192.168.1.x
      if (saved.includes("192.168.254.194")) {
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
  options: RequestInit = {}
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

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Network request failed";
    throw new ApiError(
      `Cannot connect to Vaultz API at ${getApiBaseUrl()}. Please check connection. (${errorMsg})`,
      0
    );
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
