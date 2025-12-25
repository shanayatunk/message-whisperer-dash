// Use VITE_API_URL environment variable, fallback to staging
const API_BASE = import.meta.env.VITE_API_URL || "https://staging-api.feelori.com";

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

  const response = await fetch(`${API_BASE}${endpoint}`, {
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
