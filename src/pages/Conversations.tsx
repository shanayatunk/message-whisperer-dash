import { useBusiness } from "@/contexts/BusinessContext";
import { MessageSquare } from "lucide-react";

export default function Conversations() {
  const { businessId } = useBusiness();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Conversations</h1>
        <span className="text-xs text-muted-foreground">({businessId})</span>
      </div>
      
      <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
        <p className="text-sm">Conversation list will load here</p>
        <p className="text-xs mt-1">business_id: {businessId}</p>
      </div>
    </div>
  );
}
