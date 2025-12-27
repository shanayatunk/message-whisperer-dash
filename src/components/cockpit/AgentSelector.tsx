import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Agent {
  user_id: string;
  username: string;
}

interface AgentsResponse {
  success: boolean;
  data: {
    agents: Agent[];
  };
}

interface AgentSelectorProps {
  currentAssigneeId: string | null;
  onAssign: (userId: string) => void;
  disabled: boolean;
}

export function AgentSelector({
  currentAssigneeId,
  onAssign,
  disabled,
}: AgentSelectorProps) {
  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const response = await apiRequest<AgentsResponse>("/api/v1/auth/agents");
      return response.data.agents;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading agents...</span>
      </div>
    );
  }

  return (
    <Select
      value={currentAssigneeId ?? "unassigned"}
      onValueChange={(value) => {
        if (value !== (currentAssigneeId ?? "unassigned")) {
          onAssign(value);
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger className="w-[180px] h-8 text-sm">
        <SelectValue placeholder="Select agent" />
      </SelectTrigger>
      <SelectContent className="bg-popover">
        <SelectItem value="unassigned" disabled>
          Unassigned
        </SelectItem>
        {agents?.map((agent) => (
          <SelectItem key={agent.user_id} value={agent.user_id}>
            {agent.username}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
