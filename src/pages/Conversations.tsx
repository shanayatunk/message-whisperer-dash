import { useState, useEffect, useCallback } from "react";
import { apiRequest, ApiError, getConversations, ConversationSummary } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { TicketQueue } from "@/components/cockpit/TicketQueue";
import { ActiveChat } from "@/components/cockpit/ActiveChat";
import { Ticket } from "@/components/cockpit/TicketCard";
import { Message } from "@/components/cockpit/ChatMessages";

interface ConversationThreadResponse {
  success: boolean;
  data: {
    conversation: ConversationSummary;
    messages: Message[];
  };
}

export default function Conversations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filter, setFilter] = useState("all");
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

  // Cursor pagination state
  const [allConversations, setAllConversations] = useState<ConversationSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Convert ConversationSummary to Ticket format for compatibility
  const ticketsData: Ticket[] = allConversations.map((conv) => ({
    _id: conv.id,
    phone: conv.phone,
    preview: conv.preview,
    status: conv.status,
    last_at: conv.last_at,
    ai_enabled: conv.ai_enabled,
    ai_paused_by: conv.ai_paused_by,
    assigned_to: conv.assigned_to,
    assigned_to_username: conv.assigned_to_username,
  }));

  // Initial fetch and filter change
  const fetchInitial = async () => {
    setIsLoadingInitial(true);
    setIsError(false);
    setIsFetching(true);
    try {
      const statusParam = filter !== "all" ? filter : undefined;
      const response = await getConversations(null, 20, statusParam);
      setAllConversations(response.data);
      setNextCursor(response.next_cursor);
    } catch {
      setIsError(true);
    } finally {
      setIsLoadingInitial(false);
      setIsFetching(false);
    }
  };

  // Load more with cursor
  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const statusParam = filter !== "all" ? filter : undefined;
      const response = await getConversations(nextCursor, 20, statusParam);
      setAllConversations((prev) => [...prev, ...response.data]);
      setNextCursor(response.next_cursor);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to load more" });
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Fetch on mount and filter change
  useEffect(() => {
    fetchInitial();
  }, [filter]);

  // Refresh function
  const handleRefresh = () => {
    fetchInitial();
  };

  // Fetch messages for selected ticket
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    isError: isMessagesError,
  } = useQuery({
    queryKey: ["messages", selectedTicket?._id],
    queryFn: async () => {
      if (!selectedTicket) return [];
      const response = await apiRequest<ConversationThreadResponse>(
        `/api/v1/conversations/${selectedTicket._id}`
      );
      return response.data.messages;
    },
    enabled: !!selectedTicket,
    refetchInterval: selectedTicket?.status === 'resolved' ? false : 3000,
  });

  // Combine fetched messages with optimistic ones, sorted chronologically
  const allMessages = [...(messagesData || []), ...optimisticMessages].sort(
    (a, b) => {
      const tA = new Date(a.timestamp || a.created_at || 0).getTime();
      const tB = new Date(b.timestamp || b.created_at || 0).getTime();
      return tA - tB;
    }
  );

  // Helper to update conversation in list optimistically
  const updateConversationOptimistically = useCallback((id: string, updates: Partial<ConversationSummary>) => {
    setAllConversations((prev) =>
      prev.map((conv) => (conv.id === id ? { ...conv, ...updates } : conv))
    );
    // Also update selected ticket if it's the one being modified
    if (selectedTicket?._id === id) {
      setSelectedTicket((prev) => prev ? { ...prev, ...updates } as Ticket : null);
    }
  }, [selectedTicket]);

  // Assign mutation with optimistic update
  const assignMutation = useMutation({
    mutationFn: ({ ticketId, userId }: { ticketId: string; userId: string }) =>
      apiRequest(`/api/v1/conversations/${ticketId}/assign`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      }),
    onMutate: async ({ ticketId, userId }) => {
      // Optimistic update - show agent ID immediately
      updateConversationOptimistically(ticketId, {
        assigned_to: userId,
        assigned_to_username: userId.length > 12 ? undefined : userId,
      } as any);
    },
    onSuccess: () => {
      toast({ title: "Assigned", description: "Ticket assigned successfully" });
    },
    onError: (error, { ticketId }) => {
      // Revert on error
      updateConversationOptimistically(ticketId, { assigned_to: null, assigned_to_username: null } as any);
      const message = error instanceof ApiError ? error.message : "Assignment failed";
      toast({ variant: "destructive", title: "Error", description: message });
    },
  });

  // Resolve mutation with optimistic update
  const resolveMutation = useMutation({
    mutationFn: (ticketId: string) =>
      apiRequest(`/api/v1/conversations/${ticketId}/resolve`, {
        method: "PUT",
      }),
    onMutate: async (ticketId) => {
      // Save current state for rollback
      const previousConversations = [...allConversations];
      const previousSelectedTicket = selectedTicket;

      // If filtering by 'open', remove from list immediately
      if (filter === "open") {
        setAllConversations((prev) => prev.filter((c) => c.id !== ticketId));
      } else {
        // Otherwise just update status
        updateConversationOptimistically(ticketId, { status: "resolved" } as any);
      }

      // Auto-select next ticket
      const currentIndex = ticketsData?.findIndex((t) => t._id === ticketId) ?? -1;
      const nextTicket = ticketsData?.[currentIndex + 1] || ticketsData?.[0] || null;
      if (nextTicket && nextTicket._id !== ticketId) {
        setSelectedTicket(nextTicket);
      } else {
        setSelectedTicket(null);
      }
      setOptimisticMessages([]);

      return { previousConversations, previousSelectedTicket };
    },
    onSuccess: () => {
      toast({ title: "Resolved", description: "Ticket marked as resolved" });
    },
    onError: (error, ticketId, context) => {
      // Revert on error
      if (context) {
        setAllConversations(context.previousConversations);
        setSelectedTicket(context.previousSelectedTicket);
      }
      const message = error instanceof ApiError ? error.message : "Resolve failed";
      toast({ variant: "destructive", title: "Error", description: message });
    },
  });

  // AI Toggle mutation with optimistic update
  const aiToggleMutation = useMutation({
    mutationFn: ({ ticketId, enabled }: { ticketId: string; enabled: boolean }) =>
      apiRequest(`/api/v1/conversations/${ticketId}/ai`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    onMutate: async ({ ticketId, enabled }) => {
      // Optimistic update - toggle AI state immediately
      const previousAiEnabled = allConversations.find((c) => c.id === ticketId)?.ai_enabled;
      const previousAiPausedBy = (allConversations.find((c) => c.id === ticketId) as any)?.ai_paused_by;
      
      updateConversationOptimistically(ticketId, {
        ai_enabled: enabled,
        ai_paused_by: enabled ? null : (user?.id || "agent"),
      } as any);

      return { ticketId, previousAiEnabled, previousAiPausedBy };
    },
    onSuccess: (_, { enabled }) => {
      toast({ 
        title: enabled ? "AI Activated" : "AI Paused", 
        description: enabled ? "AI is now handling this conversation" : "AI has been paused for this conversation" 
      });
    },
    onError: (error, _, context) => {
      // Revert on error
      if (context) {
        updateConversationOptimistically(context.ticketId, {
          ai_enabled: context.previousAiEnabled,
          ai_paused_by: context.previousAiPausedBy,
        } as any);
      }
      const message = error instanceof ApiError ? error.message : "AI toggle failed";
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
      // Rely on optimistic update only - no refetch to prevent double bubble
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

  const handleTicketUpdate = async () => {
    await fetchInitial();
    // Update selectedTicket with fresh data
    if (selectedTicket) {
      const updatedTicket = allConversations.find((c) => c.id === selectedTicket._id);
      if (updatedTicket) {
        setSelectedTicket({
          _id: updatedTicket.id,
          phone: updatedTicket.phone,
          preview: updatedTicket.preview,
          status: updatedTicket.status,
          last_at: updatedTicket.last_at,
        });
      }
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left Sidebar - 30% */}
      <div className="w-[30%] min-w-[280px] max-w-[400px]">
        <TicketQueue
          tickets={ticketsData}
          isLoading={isLoadingInitial}
          isError={isError}
          isFetching={isFetching}
          selectedTicketId={selectedTicket?._id ?? null}
          filter={filter}
          onFilterChange={setFilter}
          onSelectTicket={handleSelectTicket}
          onRefresh={handleRefresh}
          hasMore={nextCursor !== null}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
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
          isAgentTyping={sendMutation.isPending}
          hasAgentSent={optimisticMessages.length > 0}
          isTogglingAi={aiToggleMutation.isPending}
          onAssign={(userId) => selectedTicket && assignMutation.mutate({ ticketId: selectedTicket._id, userId })}
          onResolve={() => selectedTicket && resolveMutation.mutate(selectedTicket._id)}
          onSendMessage={handleSendMessage}
          onTicketUpdate={handleTicketUpdate}
          onToggleAi={(enabled) => selectedTicket && aiToggleMutation.mutate({ ticketId: selectedTicket._id, enabled })}
        />
      </div>
    </div>
  );
}
