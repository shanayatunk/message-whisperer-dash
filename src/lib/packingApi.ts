import { API_BASE, ApiError } from "./api";

export interface PackingOrder {
  order_id: string; // We force this to be a string
  order_number: string;
  customer: { name: string; phone: string };
  customer_name?: string;
  item_count?: number;
  items?: any[];
  status: "Pending" | "In Progress" | "On Hold" | "Completed";
  created_at: string;
  packer_name?: string;
  hold_reason?: string;
  notes?: string;
}

export interface PackingConfig {
  packers: string[];
  carriers: string[];
}

// Standard Backend Response Wrapper
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  version: string;
}

async function packingRequest<T>(
  businessId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
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
  getOrders: async (businessId: string): Promise<PackingOrder[]> => {
    const response = await packingRequest<{ orders: any[] }>(businessId, "/packing/orders");
    
    // Safety Mapping: Ensure ID is a string and handle item counts
    return response.data.orders.map(order => ({
      ...order,
      // Map 'id' (backend) to 'order_id' (frontend) if needed, and force string
      order_id: String(order.order_id || order.id || ""), 
      order_number: String(order.order_number || ""),
      customer_name: order.customer?.name || "Unknown",
      // Calculate total quantity (sum of item quantities), not just array length
      item_count: order.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 0
    }));
  },

  getConfig: async (businessId: string): Promise<PackingConfig> => {
    const response = await packingRequest<PackingConfig>(businessId, "/packing/config");
    // Ensure we return valid arrays even if backend sends null
    return {
        packers: response.data.packers || [],
        carriers: response.data.carriers || []
    };
  },

  startOrder: async (businessId: string, orderId: string): Promise<void> => {
    await packingRequest<void>(businessId, `/orders/${orderId}/start`, { method: "POST" });
  },

  holdOrder: async (businessId: string, orderId: string, reason: string, notes: string): Promise<void> => {
    await packingRequest<void>(businessId, `/orders/${orderId}/hold`, {
      method: "POST",
      body: JSON.stringify({ reason, notes }),
    });
  },

  fulfillOrder: async (
    businessId: string,
    orderId: string,
    packer: string,
    carrier: string,
    trackingNumber: string
  ): Promise<void> => {
    await packingRequest<void>(businessId, `/orders/${orderId}/fulfill`, {
      method: "POST",
      body: JSON.stringify({ 
        packer_name: packer,
        carrier, 
        tracking_number: trackingNumber 
      }),
    });
  },
};
