import { useBusiness } from "@/contexts/BusinessContext";
import { apiRequest } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, UserCheck, Package } from "lucide-react";

interface PackerPerformance {
  packer_name: string;
  orders_packed: number;
  avg_time_minutes: number;
}

interface ConversationStats {
  active_count: number;
  human_takeover_count: number;
}

export default function DashboardHome() {
  const { businessId } = useBusiness();

  // Fetch conversation stats
  const { data: conversationStats, isLoading: statsLoading } = useQuery({
    queryKey: ["conversation-stats", businessId],
    queryFn: async () => {
      // The API returns { success: true, data: { active_count: 5, ... } }
      // We need to extract the 'data' property.
      const response = await apiRequest<{ data: ConversationStats }>(
        `/api/v1/conversations/stats?business_id=${encodeURIComponent(businessId)}`
      );
      return response.data;
    },
  });

  // Fetch packer performance from the correct admin endpoint
  // CRITICAL: Do NOT use /packing or /api/v1/packing - that's internal-only
  const { data: packerPerformance, isLoading: packersLoading } = useQuery({
    queryKey: ["packer-performance", businessId],
    queryFn: async () => {
      // The API returns { success: true, data: { metrics: [...] } }
      // We need to extract data.metrics
      const response = await apiRequest<{ data: { metrics: PackerPerformance[] } }>(
        `/api/v1/admin/packer-performance?business_id=${encodeURIComponent(businessId)}`
      );
      return response.data?.metrics || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview for {businessId === "feelori" ? "Feelori" : "Golden Collections"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Active Conversations Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Conversations
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <div className="text-3xl font-bold">
                {conversationStats?.active_count ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Currently ongoing chats
            </p>
          </CardContent>
        </Card>

        {/* Human Takeovers Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Human Takeovers
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <div className="text-3xl font-bold">
                {conversationStats?.human_takeover_count ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Escalated to agents
            </p>
          </CardContent>
        </Card>

        {/* Packer Performance Card */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Packing Performance
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {packersLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : packerPerformance && packerPerformance.length > 0 ? (
              <div className="space-y-2">
                {packerPerformance.slice(0, 3).map((packer) => (
                  <div
                    key={packer.packer_name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{packer.packer_name}</span>
                    <span className="text-muted-foreground">
                      {packer.orders_packed ?? 0} orders ({(packer.avg_time_minutes ?? 0).toFixed(1)} min avg)
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No packing data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
