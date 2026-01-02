import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Bot, User, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Ticket {
  _id: string;
  phone?: string;
  customer_phone?: string;
  preview?: string;
  order_number?: string;
  issue_type?: string;
  image_media_id?: string | null;
  status: string;
  assigned_to?: string | null;
  assigned_to_username?: string | null;
  last_at?: string | null;
  created_at?: string;
}

interface TicketCardProps {
  ticket: Ticket;
  isSelected: boolean;
  onClick: () => void;
}

const normalizeUTC = (dateStr: string) =>
  dateStr.endsWith("Z") ? dateStr : `${dateStr}Z`;

export function TicketCard({ ticket, isSelected, onClick }: TicketCardProps) {
  const dateStr = ticket.created_at || ticket.last_at;
  const createdAt = dateStr ? new Date(normalizeUTC(dateStr)) : new Date();
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });
  const isHumanNeeded = ticket.status === "human_needed";
  const displayPhone = ticket.phone || ticket.customer_phone || "Unknown";

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 border-b border-border cursor-pointer transition-colors",
        "hover:bg-muted/50",
        isSelected && "bg-primary/15 border-l-4 border-l-primary"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-mono text-sm font-medium text-foreground">
          {displayPhone}
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
      
      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="flex items-center gap-2">
          {ticket.issue_type && (
            <Badge variant="outline" className="text-xs">
              {ticket.issue_type}
            </Badge>
          )}
          {ticket.preview && (
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {ticket.preview}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
        
        {ticket.assigned_to && (
          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 max-w-[100px]">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {ticket.assigned_to_username || ticket.assigned_to}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}