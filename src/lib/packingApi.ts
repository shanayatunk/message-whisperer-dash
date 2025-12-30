import { API_BASE, ApiError } from "./api";

export interface PackingOrder {
  order_id: string;
  customer_name: string;
  item_count: number;
  status: "pending" | "in_progress" | "on_hold" | "completed";
  created_at: string;
  hold_reason?: string;
  hold_notes?: string;
}

export interface PackingConfig {
  packers: string[];
  carriers: string[];
}

async function packingRequest<T>(
  businessId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = sessionStorage.getItem("auth_token");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "x-business-id": businessId,
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    sessionStorage.removeItem("auth_token");
    window.location.href = "/login";
    throw new ApiError(401, "Unauthorized");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new ApiError(response.status, errorData.detail || "Request failed");
  }

  return response.json();
}

export const packingApi = {
  getOrders: (businessId: string): Promise<PackingOrder[]> =>
    packingRequest<PackingOrder[]>(businessId, "/packing/orders"),

  getConfig: (businessId: string): Promise<PackingConfig> =>
    packingRequest<PackingConfig>(businessId, "/packing/config"),

  startOrder: (businessId: string, orderId: string): Promise<void> =>
    packingRequest<void>(businessId, `/orders/${orderId}/start`, { method: "POST" }),

  holdOrder: (businessId: string, orderId: string, reason: string, notes: string): Promise<void> =>
    packingRequest<void>(businessId, `/orders/${orderId}/hold`, {
      method: "POST",
      body: JSON.stringify({ reason, notes }),
    }),

  fulfillOrder: (
    businessId: string,
    orderId: string,
    packer: string,
    carrier: string,
    trackingNumber: string
  ): Promise<void> =>
    packingRequest<void>(businessId, `/orders/${orderId}/fulfill`, {
      method: "POST",
      body: JSON.stringify({ packer_name: packer, carrier, tracking_number: trackingNumber }),
    }),
};
