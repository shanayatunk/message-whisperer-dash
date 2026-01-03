import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Bot, User, Pause } from "lucide-react";
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
  ai_enabled?: boolean;
  ai_paused_by?: string | null;
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
  const displayPhone = ticket.phone || ticket.customer_phone || "Unknown";

  // AI status: active if enabled and not paused
  const isAiActive = ticket.ai_enabled === true && ticket.ai_paused_by === null;

  // Format assigned_to display
  const getAssignmentDisplay = () => {
    if (!ticket.assigned_to) return "Unassigned";
    if (ticket.assigned_to_username) return ticket.assigned_to_username;
    // Truncate long IDs
    if (ticket.assigned_to.length > 12) {
      return `Agent ${ticket.assigned_to.slice(0, 4)}...`;
    }
    return ticket.assigned_to;
  };

  // Status display
  const getStatusBadge = () => {
    const status = ticket.status?.toLowerCase();
    if (status === "resolved" || status === "closed") {
      return <Badge variant="secondary" className="text-xs">Resolved</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Open</Badge>;
  };

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
        <div className="flex items-center gap-1.5">
          {isAiActive ? (
            <Badge variant="secondary" className="text-xs gap-1 shrink-0 bg-green-900/30 text-green-400 hover:bg-green-900/40">
              <Bot className="h-3 w-3" />
              AI Active
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs gap-1 shrink-0 bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/40">
              <Pause className="h-3 w-3" />
              AI Paused
            </Badge>
          )}
          {getStatusBadge()}
        </div>
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
        
        <span className={cn(
          "inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 max-w-[100px]",
          ticket.assigned_to 
            ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" 
            : "bg-muted text-muted-foreground"
        )}>
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{getAssignmentDisplay()}</span>
        </span>
      </div>
    </div>
  );
}