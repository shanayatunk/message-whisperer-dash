import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TicketCard, Ticket } from "./TicketCard";
import { RefreshCw, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TicketQueueProps {
  tickets: Ticket[] | undefined;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  selectedTicketId: string | null;
  filter: string;
  onFilterChange: (filter: string) => void;
  onSelectTicket: (ticket: Ticket) => void;
  onRefresh: () => void;
}

export function TicketQueue({
  tickets,
  isLoading,
  isError,
  isFetching,
  selectedTicketId,
  filter,
  onFilterChange,
  onSelectTicket,
  onRefresh,
}: TicketQueueProps) {
  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* Header */}
      <div className="p-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground">The Queue</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
        
        <Select value={filter} onValueChange={onFilterChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Filter tickets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Needs Attention</SelectItem>
            <SelectItem value="pending">Pending (Bot)</SelectItem>
            <SelectItem value="human_needed">Human Needed</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Ticket List */}
      <ScrollArea className="flex-1">
        {isLoading && (
          <div className="p-3 space-y-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <div className="p-4 text-center text-sm text-destructive">
            Failed to load tickets
            <Button variant="link" size="sm" onClick={onRefresh} className="block mx-auto mt-1">
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && tickets?.length === 0 && (
          <div className="p-6 text-center text-muted-foreground">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tickets found</p>
          </div>
        )}

        {!isLoading && !isError && tickets && tickets.length > 0 && (
          <div>
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket._id}
                ticket={ticket}
                isSelected={selectedTicketId === ticket._id}
                onClick={() => onSelectTicket(ticket)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer with count */}
      {tickets && tickets.length > 0 && (
        <div className="p-2 border-t border-border bg-muted/20 text-xs text-muted-foreground text-center">
          {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
