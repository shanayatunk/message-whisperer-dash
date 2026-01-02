import { useBusiness } from "@/contexts/BusinessContext";
import { apiRequest, AbandonedCartsStats, APIResponse } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, UserCheck, Package, ShoppingCart, RefreshCw, IndianRupee } from "lucide-react";

interface PackerPerformance {
  packer_name: string;
  orders_packed: number;
  avg_time_minutes: number;
}

interface ConversationStats {
  open: number;
  resolved: number;
  triaged?: number;
  total?: number;
  abandoned_carts?: AbandonedCartsStats;
}

export default function DashboardHome() {
  const { businessId } = useBusiness();

  // Fetch conversation stats - backend extracts tenant from auth token
  const { data: conversationStats, isLoading: statsLoading } = useQuery({
    queryKey: ["conversation-stats", businessId],
    queryFn: async () => {
      const response = await apiRequest<APIResponse<ConversationStats>>(
        `/api/v1/conversations/stats`
      );
      return response.data;
    },
  });

  // Fetch packer performance - backend extracts tenant from auth token
  const { data: packerPerformance, isLoading: packersLoading } = useQuery({
    queryKey: ["packer-performance", businessId],
    queryFn: async () => {
      const response = await apiRequest<APIResponse<{ metrics: PackerPerformance[] }>>(
        `/api/v1/admin/packer-performance`
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
                {conversationStats?.open ?? 0}
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
                {conversationStats?.triaged ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Escalated to agents
            </p>
          </CardContent>
        </Card>

        {/* Abandoned Carts (Today) Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Abandoned Carts (Today)
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <div className="text-3xl font-bold">
                {conversationStats?.abandoned_carts?.today_count ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Carts left behind
            </p>
          </CardContent>
        </Card>

        {/* Recovered Carts Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recovered Carts
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <div className="text-3xl font-bold text-green-600">
                {conversationStats?.abandoned_carts?.recovered_count ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Successfully recovered
            </p>
          </CardContent>
        </Card>

        {/* Revenue Saved Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue Saved
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <div className="text-3xl font-bold text-green-600">
                ₹ {(conversationStats?.abandoned_carts?.revenue_recovered ?? 0).toLocaleString("en-IN")}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              From recovered carts
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
