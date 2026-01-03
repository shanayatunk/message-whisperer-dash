import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, Bot } from "lucide-react";
import { Ticket } from "./TicketCard";
import { AgentSelector } from "./AgentSelector";

interface ChatHeaderProps {
  ticket: Ticket;
  isAssigning: boolean;
  isResolving: boolean;
  isTogglingAi?: boolean;
  onAssign: (userId: string) => void;
  onResolve: () => void;
  onToggleAi?: (enabled: boolean) => void;
}

export function ChatHeader({
  ticket,
  isAssigning,
  isResolving,
  isTogglingAi,
  onAssign,
  onResolve,
  onToggleAi,
}: ChatHeaderProps) {
  const isAiActive = ticket.ai_enabled === true && ticket.ai_paused_by === null;

  return (
    <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
      <div>
        <div className="font-mono text-sm font-medium text-foreground">
          {ticket.customer_phone || ticket.phone}
        </div>
        <div className="text-xs text-muted-foreground">
          Ticket: {ticket._id.slice(-8)}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* AI Toggle */}
        {onToggleAi && (
          <div className="flex items-center gap-2">
            <Bot className={`h-4 w-4 ${isAiActive ? "text-green-500" : "text-muted-foreground"}`} />
            <Switch
              id="ai-toggle"
              checked={isAiActive}
              onCheckedChange={onToggleAi}
              disabled={isTogglingAi || isAssigning || isResolving}
            />
            <Label htmlFor="ai-toggle" className="text-xs text-muted-foreground cursor-pointer">
              AI
            </Label>
          </div>
        )}

        <AgentSelector
          currentAssigneeId={ticket.assigned_to ?? null}
          onAssign={onAssign}
          disabled={isAssigning || isResolving}
        />

        <Button
          variant="default"
          size="sm"
          onClick={onResolve}
          disabled={isAssigning || isResolving}
        >
          {isResolving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-1" />
              Resolve
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
