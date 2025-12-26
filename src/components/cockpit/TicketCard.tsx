import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Bot, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Ticket {
  _id: string;
  customer_phone: string;
  order_number: string;
  issue_type: string;
  image_media_id: string | null;
  status: string;
  created_at: string;
}

interface TicketCardProps {
  ticket: Ticket;
  isSelected: boolean;
  onClick: () => void;
}

export function TicketCard({ ticket, isSelected, onClick }: TicketCardProps) {
  const timeAgo = formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true });
  const isHumanNeeded = ticket.status === "human_needed";

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 border-b border-border cursor-pointer transition-colors",
        "hover:bg-muted/50",
        isSelected && "bg-primary/10 border-l-2 border-l-primary"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-mono text-sm font-medium text-foreground">
          {ticket.customer_phone}
        </span>
        {isHumanNeeded ? (
          <Badge variant="destructive" className="text-xs gap-1 shrink-0">
            <UserCheck className="h-3 w-3" />
            Human
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs gap-1 shrink-0 bg-green-900/30 text-green-400 hover:bg-green-900/40">
            <Bot className="h-3 w-3" />
            Bot
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-2 mt-1">
        <Badge variant="outline" className="text-xs">
          {ticket.issue_type}
        </Badge>
        <span className="text-xs text-muted-foreground">{timeAgo}</span>
      </div>
    </div>
  );
}
