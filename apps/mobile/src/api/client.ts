import { Platform } from "react-native";
import { secureStore } from "@/security/secureStore";

// Default local dev URLs:
// - Android Emulator uses 10.0.2.2 to access host machine localhost
// - iOS Simulator and Web use localhost:5180
const DEFAULT_API_BASE_URL = Platform.select({
  android: "http://10.0.2.2:5180",
  default: "http://localhost:5180",
});

let configuredApiBaseUrl = DEFAULT_API_BASE_URL;

export function setApiBaseUrl(url: string) {
  if (url) {
    configuredApiBaseUrl = url.replace(/\/+$/, "");
  }
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

  if (response.status === 401) {
    await secureStore.removeToken();
    onUnauthorizedCallback?.();
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  if (response.status === 204) {
    return {} as T;
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
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
