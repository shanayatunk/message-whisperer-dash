import { useState } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { apiRequest, ApiError } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { TicketQueue } from "@/components/cockpit/TicketQueue";
import { ActiveChat } from "@/components/cockpit/ActiveChat";
import { Ticket } from "@/components/cockpit/TicketCard";
import { Message } from "@/components/cockpit/ChatMessages";

interface TicketsResponse {
  success: boolean;
  message: string;
  data: {
    tickets: Ticket[];
  };
}

interface MessagesResponse {
  success: boolean;
  data: {
    messages: Message[];
  };
}

export default function Conversations() {
  const { businessId } = useBusiness();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filter, setFilter] = useState("all");
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

  // Fetch tickets
  const {
    data: ticketsData,
    isLoading: isLoadingTickets,
    isError: isTicketsError,
    refetch: refetchTickets,
    isFetching: isFetchingTickets,
  } = useQuery({
    queryKey: ["tickets", businessId, filter],
    queryFn: async () => {
      const params = new URLSearchParams({ business_id: businessId });
      if (filter !== "all") {
        params.append("status", filter);
      }
      const response = await apiRequest<TicketsResponse>(`/api/v1/conversations?${params}`);
      return response.data.tickets;
    },
  });

  // Fetch messages for selected ticket
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    isError: isMessagesError,
  } = useQuery({
    queryKey: ["messages", selectedTicket?._id],
    queryFn: async () => {
      if (!selectedTicket) return [];
      const response = await apiRequest<MessagesResponse>(
        `/api/v1/conversations/${selectedTicket._id}/messages`
      );
      return response.data.messages;
    },
    enabled: !!selectedTicket,
  });

  // Combine fetched messages with optimistic ones
  const allMessages = [...(messagesData || []), ...optimisticMessages];

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: (ticketId: string) =>
      apiRequest(`/api/v1/conversations/${ticketId}/assign`, {
        method: "POST",
        body: JSON.stringify({ user_id: "me" }),
      }),
    onSuccess: () => {
      toast({ title: "Assigned", description: "Ticket assigned to you" });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Assignment failed";
      toast({ variant: "destructive", title: "Error", description: message });
    },
  });

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: (ticketId: string) =>
      apiRequest(`/api/v1/conversations/${ticketId}/resolve`, {
        method: "PUT",
      }),
    onSuccess: () => {
      toast({ title: "Resolved", description: "Ticket marked as resolved" });
      
      // Remove from queue and clear chat
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      
      // Auto-select next ticket
      const currentIndex = ticketsData?.findIndex((t) => t._id === selectedTicket?._id) ?? -1;
      const nextTicket = ticketsData?.[currentIndex + 1] || ticketsData?.[0] || null;
      
      if (nextTicket && nextTicket._id !== selectedTicket?._id) {
        setSelectedTicket(nextTicket);
      } else {
        setSelectedTicket(null);
      }
      
      setOptimisticMessages([]);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Resolve failed";
      toast({ variant: "destructive", title: "Error", description: message });
    },
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: ({ ticketId, message }: { ticketId: string; message: string }) =>
      apiRequest(`/api/v1/conversations/${ticketId}/send`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    onMutate: async ({ message }) => {
      // Optimistic update
      const newMessage: Message = {
        id: `optimistic-${Date.now()}`,
        content: message,
        sender: "agent",
        timestamp: new Date().toISOString(),
      };
      setOptimisticMessages((prev) => [...prev, newMessage]);
    },
    onSuccess: () => {
      // Clear optimistic and refetch real messages
      setOptimisticMessages([]);
      queryClient.invalidateQueries({ queryKey: ["messages", selectedTicket?._id] });
    },
    onError: (error) => {
      setOptimisticMessages([]);
      const message = error instanceof ApiError ? error.message : "Send failed";
      toast({ variant: "destructive", title: "Error", description: message });
    },
  });

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setOptimisticMessages([]);
  };

  const handleSendMessage = (message: string) => {
    if (!selectedTicket) return;
    sendMutation.mutate({ ticketId: selectedTicket._id, message });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left Sidebar - 30% */}
      <div className="w-[30%] min-w-[280px] max-w-[400px]">
        <TicketQueue
          tickets={ticketsData}
          isLoading={isLoadingTickets}
          isError={isTicketsError}
          isFetching={isFetchingTickets}
          selectedTicketId={selectedTicket?._id ?? null}
          filter={filter}
          onFilterChange={setFilter}
          onSelectTicket={handleSelectTicket}
          onRefresh={() => refetchTickets()}
        />
      </div>

      {/* Right Panel - 70% */}
      <div className="flex-1">
        <ActiveChat
          ticket={selectedTicket}
          messages={allMessages}
          isLoadingMessages={isLoadingMessages}
          isMessagesError={isMessagesError}
          isAssigning={assignMutation.isPending}
          isResolving={resolveMutation.isPending}
          isSending={sendMutation.isPending}
          onAssign={() => selectedTicket && assignMutation.mutate(selectedTicket._id)}
          onResolve={() => selectedTicket && resolveMutation.mutate(selectedTicket._id)}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
