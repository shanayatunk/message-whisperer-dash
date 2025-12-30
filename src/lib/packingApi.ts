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

export interface PackingMetrics {
  pending: number;
  in_progress: number;
  on_hold: number;
  completed_today: number;
}

export interface PackerPerformance {
  name: string;
  count: number;
  last_active: string;
}

// Standard Backend Response Wrapper
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  version?: string; // Make optional to prevent frontend crashes
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
    let errorMsg = "Request failed";
    try {
      const errorData = await response.json();
      errorMsg = errorData.detail || errorData.message || "Request failed";
    } catch (e) {
      console.warn("Non-JSON error response", e);
    }
    throw new ApiError(response.status, errorMsg);
  }

  return response.json();
}

export const packingApi = {
  getOrders: async (businessId: string, status: string = 'pending'): Promise<PackingOrder[]> => {
    const statusParam = status === 'all' ? '' : `?status=${status}`;
    const response = await packingRequest<{ orders: any[] }>(
      businessId, 
      `/api/v1/packing/orders${statusParam}`
    );
    
    console.log(`[getOrders] Raw response:`, response);
    
    return (response.data.orders || []).map((order: any) => {
      // 1. Resolve Customer Name
      // Check nested object first, then flat fields, then fallback
      let customerName = "Guest";
      if (order.customer && typeof order.customer === 'object') {
        customerName = order.customer.name || 
                       (order.customer.first_name ? `${order.customer.first_name} ${order.customer.last_name || ''}` : "Guest");
      } else if (order.customer_name) {
        customerName = order.customer_name;
      }

      // 2. Resolve Order Number (Display Name)
      // Prefer 'name' (e.g. #FO1067) -> then 'order_number' (e.g. 1067) -> then ID
      const displayNumber = order.name || order.order_number || String(order.id);

      return {
        ...order,
        order_id: String(order.order_id || order.id || order._id || ""),
        order_number: displayNumber, 
        customer_name: customerName,
        item_count: order.items?.length || 0
      };
    });
  },

  getConfig: async (businessId: string): Promise<PackingConfig> => {
    const response = await packingRequest<PackingConfig>(businessId, "/api/v1/packing/config");
    // Ensure we return valid arrays even if backend sends null
    return {
        packers: response.data.packers || [],
        carriers: response.data.carriers || []
    };
  },

  startOrder: async (businessId: string, orderId: string): Promise<void> => {
    if (!orderId) {
      console.error("Attempted to call startOrder with empty orderId");
      throw new Error("Invalid Order ID");
    }
    console.log("Starting order:", orderId);
    await packingRequest<void>(businessId, `/api/v1/packing/orders/${orderId}/start`, { method: "POST" });
  },

  holdOrder: async (businessId: string, orderId: string, reason: string, notes: string): Promise<void> => {
    if (!orderId) {
      console.error("Attempted to call holdOrder with empty orderId");
      throw new Error("Invalid Order ID");
    }
    await packingRequest<void>(businessId, `/api/v1/packing/orders/${orderId}/hold`, {
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
    if (!orderId) {
      console.error("Attempted to call fulfillOrder with empty orderId");
      throw new Error("Invalid Order ID");
    }
    await packingRequest<void>(businessId, `/api/v1/packing/orders/${orderId}/fulfill`, {
      method: "POST",
      body: JSON.stringify({ 
        packer_name: packer,
        carrier, 
        tracking_number: trackingNumber 
      }),
    });
  },

  requeueOrder: async (businessId: string, orderId: string): Promise<void> => {
    if (!orderId) {
      console.error("Attempted to call requeueOrder with empty orderId");
      throw new Error("Invalid Order ID");
    }
    await packingRequest<void>(businessId, `/api/v1/packing/orders/${orderId}/requeue`, { method: "POST" });
  },

  getMetrics: async (businessId: string): Promise<PackingMetrics> => {
    const response = await packingRequest<PackingMetrics>(businessId, "/api/v1/packing/metrics");
    return {
      pending: response.data.pending || 0,
      in_progress: response.data.in_progress || 0,
      on_hold: response.data.on_hold || 0,
      completed_today: response.data.completed_today || 0,
    };
  },

  getPerformance: async (businessId: string, days: number = 7): Promise<PackerPerformance[]> => {
    const response = await packingRequest<{ packers: PackerPerformance[] }>(
      businessId,
      `/api/v1/packing/packer-performance?days=${days}`
    );
    return response.data.packers || [];
  },
};
