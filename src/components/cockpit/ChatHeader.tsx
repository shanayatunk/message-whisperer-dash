import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { Ticket } from "./TicketCard";
import { AgentSelector } from "./AgentSelector";

interface ChatHeaderProps {
  ticket: Ticket;
  isAssigning: boolean;
  isResolving: boolean;
  onAssign: (userId: string) => void;
  onResolve: () => void;
}

export function ChatHeader({
  ticket,
  isAssigning,
  isResolving,
  onAssign,
  onResolve,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
      <div>
        <div className="font-mono text-sm font-medium text-foreground">
          {ticket.customer_phone}
        </div>
        <div className="text-xs text-muted-foreground">
          Ticket: {ticket._id.slice(-8)}
        </div>
      </div>

      <div className="flex items-center gap-2">
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
