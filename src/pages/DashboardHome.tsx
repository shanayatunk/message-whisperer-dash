import { useBusiness } from "@/contexts/BusinessContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, UserCheck } from "lucide-react";

export default function DashboardHome() {
  const { businessId } = useBusiness();

  // Mock data - will be replaced with API calls
  const metrics = {
    activeConversations: 24,
    humanTakeovers: 7,
  };

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
            <div className="text-3xl font-bold">{metrics.activeConversations}</div>
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
            <div className="text-3xl font-bold">{metrics.humanTakeovers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Escalated to agents
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
