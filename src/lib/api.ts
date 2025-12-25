// Force HTTPS for API base URL
const resolveApiBase = (): string => {
  let base =
    (import.meta.env.VITE_API_URL as string) ||
    "https://staging-api.feelori.com";
  base = base.trim();

  // Force HTTPS to prevent Mixed Content errors
  if (base.startsWith("http://")) {
    base = base.replace("http://", "https://");
  }

  // Remove trailing slash to avoid double slashes
  return base.replace(/\/+$/, "");
};

const API_BASE = resolveApiBase();
export { API_BASE };

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

  // Critical debugging for Mixed Content issues
  if (url.startsWith("http://")) {
    console.error("[api] BLOCKED insecure request URL:", url);
    console.error("[api] Called from:\n", new Error("Insecure API URL").stack);
  } else {
    debugLog("request", { url, method: options.method ?? "GET" });
  }

  const response = await fetch(url, {
    ...options,
    headers,
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
}

export async function login(
  username: string,
  password: string
): Promise<{ access_token: string; token_type: string }> {
  // FIXED: Endpoint matches Production pattern (/api/v1/auth/login)
  // FIXED: Content-Type is application/json
  // FIXED: Body is JSON stringified (not FormData)
  const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    // Attempt to parse the specific error message from the backend (e.g., "Invalid credentials")
    const errorData = await response.json().catch(() => ({ detail: "Invalid credentials" }));
    throw new ApiError(response.status, errorData.detail || "Invalid credentials");
  }

  return response.json();
}
