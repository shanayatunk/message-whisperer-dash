import { useState, useEffect, useCallback } from "react";
import { apiRequest, ApiError, getConversations, ConversationSummary, APIResponse } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { TicketQueue } from "@/components/cockpit/TicketQueue";
import { ActiveChat } from "@/components/cockpit/ActiveChat";
import { Ticket } from "@/components/cockpit/TicketCard";
import { Message } from "@/components/cockpit/ChatMessages";
import { Bug } from "lucide-react";

// Smart extractor: finds messages in various API response structures
function extractMessagesFromResponse(response: any): { messages: Message[]; source: string; raw: any } {
  let msgs: any[] = [];
  let source = "not_found";

  // Try common API response structures
  if (Array.isArray(response?.data?.messages)) {
    msgs = response.data.messages;
    source = "response.data.messages";
  } else if (Array.isArray(response?.messages)) {
    msgs = response.messages;
    source = "response.messages";
  } else if (Array.isArray(response)) {
    msgs = response;
    source = "root_array";
  } else if (Array.isArray(response?.data)) {
    msgs = response.data;
    source = "response.data";
  } else if (Array.isArray(response?.data?.items)) {
    msgs = response.data.items;
    source = "response.data.items";
  } else if (Array.isArray(response?.data?.conversation?.messages)) {
    msgs = response.data.conversation.messages;
    source = "response.data.conversation.messages";
  } else if (Array.isArray(response?.conversation?.messages)) {
    msgs = response.conversation.messages;
    source = "response.conversation.messages";
  }

  // Normalize: ensure text, timestamp, and sender exist
  const normalized = msgs.map((m) => {
    // Derive sender from various API formats
    let sender = m.sender;
    if (!sender) {
      if (m.direction === "inbound") sender = "user";
      else if (m.direction === "outbound") {
        // Determine if bot or agent based on source
        sender = m.source === "agent" ? "agent" : "bot";
      }
      else if (m.source === "customer") sender = "user";
      else if (m.source === "bot" || m.source === "ai") sender = "bot";
      else if (m.source === "agent") sender = "agent";
      else sender = "bot"; // Default fallback
    }
    
    return {
      ...m,
      sender,
      text: m.text || m.content || m.body || "",
      timestamp: m.timestamp || m.created_at || new Date().toISOString(),
    };
  });

  return { messages: normalized, source, raw: response };
}

export default function Conversations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { businessId } = useBusiness();
  const queryClient = useQueryClient();

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filter, setFilter] = useState("all");
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

  // Debug state
  const [showDebug, setShowDebug] = useState(false);
  const [lastApiResponse, setLastApiResponse] = useState<any>(null);
  const [extractionSource, setExtractionSource] = useState("");

  // Cursor pagination state
  const [allConversations, setAllConversations] = useState<ConversationSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Convert ConversationSummary to Ticket format for compatibility
  const allTickets: Ticket[] = allConversations.map((conv) => ({
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

  // Apply client-side filtering based on filter value
  const ticketsData: Ticket[] = allTickets.filter((ticket) => {
    if (filter === "all") {
      return ticket.status === "open" && (ticket.ai_enabled === false || ticket.ai_paused_by != null);
    }
    if (filter === "pending") {
      return ticket.status === "open" && ticket.ai_enabled === true && ticket.ai_paused_by === null;
    }
    if (filter === "resolved") {
      return ticket.status === "resolved";
    }
    return true;
  });

  // Initial fetch
  const fetchInitial = async () => {
    setIsLoadingInitial(true);
    setIsError(false);
    setIsFetching(true);
    try {
      const statusParam = filter === "resolved" ? "resolved" : "open";
      const response = await getConversations(null, 50, statusParam);
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
      const statusParam = filter === "resolved" ? "resolved" : "open";
      const response = await getConversations(nextCursor, 50, statusParam);
      setAllConversations((prev) => [...prev, ...response.data]);
      setNextCursor(response.next_cursor);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to load more" });
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Fetch on mount, filter change, or business change
  useEffect(() => {
    setSelectedTicket(null);
    setOptimisticMessages([]);
    fetchInitial();
  }, [filter, businessId]);

  const handleRefresh = () => {
    fetchInitial();
  };

  // Fetch messages for selected ticket using smart extractor
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    isError: isMessagesError,
  } = useQuery({
    queryKey: ["messages", selectedTicket?._id],
    queryFn: async () => {
      if (!selectedTicket) return [];

      try {
        const rawResponse = await apiRequest<any>(
          `/api/v1/conversations/${selectedTicket._id}`
        );

        const { messages, source, raw } = extractMessagesFromResponse(rawResponse);

        // Store for debug panel
        setLastApiResponse(raw);
        setExtractionSource(source);

        const shouldLog = import.meta.env.DEV || sessionStorage.getItem("debug_api") === "1";
        if (shouldLog) {
          console.log(`[Cockpit] Extracted ${messages.length} messages from ${source}`);
          console.log("[Cockpit] Raw response:", raw);
        }

        return messages;
      } catch (err) {
        console.error("[Cockpit] Failed to fetch thread:", err);
        throw err;
      }
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
      updateConversationOptimistically(ticketId, {
        assigned_to: userId,
        assigned_to_username: userId.length > 12 ? undefined : userId,
      } as any);
    },
    onSuccess: () => {
      toast({ title: "Assigned", description: "Ticket assigned successfully" });
    },
    onError: (error, { ticketId }) => {
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
      const previousConversations = [...allConversations];
      const previousSelectedTicket = selectedTicket;

      if (filter === "open") {
        setAllConversations((prev) => prev.filter((c) => c.id !== ticketId));
      } else {
        updateConversationOptimistically(ticketId, { status: "resolved" } as any);
      }

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
        method: "POST",
        body: JSON.stringify({ enabled }),
      }),
    onMutate: async ({ ticketId, enabled }) => {
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
      apiRequest<any>(`/api/v1/conversations/${ticketId}/send`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    onMutate: async ({ message }) => {
      const newMessage: Message = {
        id: `optimistic-${Date.now()}`,
        content: message,
        text: message,
        sender: "agent",
        timestamp: new Date().toISOString(),
      };
      setOptimisticMessages((prev) => [...prev, newMessage]);
    },
    onSuccess: (response, { ticketId }) => {
      // Clear optimistic messages since we'll get real data
      setOptimisticMessages([]);
      
      // Invalidate messages query to refetch the real message list
      queryClient.invalidateQueries({ queryKey: ["messages", ticketId] });
      
      // If backend indicates AI was paused by this action, update locally
      if (response?.ai_enabled === false || response?.data?.ai_enabled === false) {
        updateConversationOptimistically(ticketId, {
          ai_enabled: false,
          ai_paused_by: user?.id || "agent",
        } as any);
      }
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
    // Reset debug info on new selection
    setLastApiResponse(null);
    setExtractionSource("");
  };

  const handleSendMessage = (message: string) => {
    if (!selectedTicket) return;
    sendMutation.mutate({ ticketId: selectedTicket._id, message });
  };

  const handleTicketUpdate = async () => {
    await fetchInitial();
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
      <div className="flex-1 relative">
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

        {/* Debug Overlay */}
        {selectedTicket && (
          <div className="absolute bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="pointer-events-auto bg-primary/80 hover:bg-primary text-primary-foreground p-2 rounded-full cursor-pointer shadow-lg transition-all"
              title="Toggle Data Debugger"
            >
              <Bug className="h-5 w-5" />
            </button>

            {showDebug && (
              <div className="pointer-events-auto bg-card border border-border rounded-lg shadow-xl p-4 max-w-md max-h-96 overflow-auto text-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-foreground">API Response Inspector</span>
                  <span className="text-xs text-muted-foreground">Src: {extractionSource || "n/a"}</span>
                </div>
                <div className="mb-2 text-foreground">
                  Messages Found: <span className="font-bold">{allMessages.length}</span>
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">Raw API Payload:</span>
                  <pre className="mt-1 p-2 bg-muted rounded text-muted-foreground overflow-auto max-h-48">
                    {lastApiResponse ? JSON.stringify(lastApiResponse, null, 2).slice(0, 2000) : "Waiting for response..."}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
