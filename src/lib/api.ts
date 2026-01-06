import { logRequest } from "./requestLogger";

const resolveApiBase = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (import.meta.env.MODE === "development") {
    return "https://staging-api.feelori.com";
  }

  if (import.meta.env.MODE === "production") {
    return "https://api.feelori.com";
  }

  throw new Error(
    "API base URL could not be resolved. Please check your environment variables or build mode."
  );
};

export const API_BASE = resolveApiBase();

const shouldDebugApi = () =>
  sessionStorage.getItem("debug_api") === "1" || import.meta.env.DEV;

const debugLog = (...args: unknown[]) => {
  if (shouldDebugApi()) console.debug("[api]", ...args);
};

debugLog("VITE_API_URL:", import.meta.env.VITE_API_URL);
debugLog("API_BASE:", API_BASE);

if (API_BASE.startsWith("http://")) {
  console.error("[api] API_BASE is http:// (will cause Mixed Content):", API_BASE);
}

// Generic API response wrapper
export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  version?: string;
}

// Stats data types
export interface AbandonedCartsStats {
  today_count: number;
  recovered_count: number;
  revenue_recovered: number;
}

// Conversation types aligned with SaaS backend
export interface ConversationSummary {
  id: string;
  phone: string;
  preview: string;
  status: string;
  last_at: string | null;
  ai_enabled?: boolean;
  ai_paused_by?: string | null;
  assigned_to?: string | null;
  assigned_to_username?: string | null;
}

export interface ConversationsResponse {
  data: ConversationSummary[];
  next_cursor: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = sessionStorage.getItem("auth_token");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;
  const method = (options.method ?? "GET").toUpperCase();
  const isInsecure = url.startsWith("http://");

  // Critical debugging for Mixed Content issues
  if (isInsecure) {
    console.error("[api] BLOCKED insecure request URL:", url);
    console.error("[api] Called from:\n", new Error("Insecure API URL").stack);
    logRequest({ url, method, isInsecure: true, error: "BLOCKED - insecure" });
  } else {
    debugLog("request", { url, method });
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    logRequest({
      url,
      method,
      isInsecure,
      status: response.status,
      redirected: response.redirected,
    });

    if (response.status === 401) {
      sessionStorage.removeItem("auth_token");
      window.location.href = "/login";
      throw new ApiError(401, "Unauthorized");
    }

    if (response.status >= 500) {
      const errorData = await response.json().catch(() => ({ detail: "Server error" }));
      throw new ApiError(response.status, errorData.detail || "Server error");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "Request failed" }));
      throw new ApiError(response.status, errorData.detail || "Request failed");
    }

    return response.json();
  } catch (err) {
    if (!(err instanceof ApiError)) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logRequest({ url, method, isInsecure, error: errMsg });
    }
    throw err;
  }
}

export async function login(
  username: string,
  password: string
): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Invalid credentials" }));
    throw new ApiError(response.status, errorData.detail || "Invalid credentials");
  }

  const data = await response.json();
  sessionStorage.setItem("auth_token", data.access_token);

  return data;
}

export async function switchTenant(targetId: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>(`/api/v1/auth/switch-tenant/${targetId}`, {
    method: "POST",
  });
}

export async function getConversations(
  cursor?: string | null,
  limit: number = 20,
  status?: string
): Promise<ConversationsResponse> {
  const params = new URLSearchParams();
  if (cursor) params.append("cursor", cursor);
  params.append("limit", String(limit));
  if (status) params.append("status", status);

  const queryString = params.toString();
  const endpoint = `/api/v1/conversations${queryString ? `?${queryString}` : ""}`;

  // Fetch the wrapper and return only the inner data object
  const response = await apiRequest<APIResponse<ConversationsResponse>>(endpoint);
  return response.data;
}

// Broadcast Groups
export interface BroadcastGroup {
  _id: string;
  name: string;
  phone_numbers: string[];
  created_at: string;
}

export interface BroadcastGroupCreate {
  name: string;
  phone_numbers: string[];
}

export async function getBroadcastGroups(): Promise<BroadcastGroup[]> {
  const response = await apiRequest<APIResponse<{ groups: BroadcastGroup[] }>>("/api/v1/broadcasts/groups");
  return response.data.groups;
}

export async function createBroadcastGroup(name: string, phones: string[]): Promise<BroadcastGroup> {
  const response = await apiRequest<APIResponse<BroadcastGroup>>("/api/v1/broadcasts/groups", {
    method: "POST",
    body: JSON.stringify({ name, phone_numbers: phones }),
  });
  return response.data;
}

