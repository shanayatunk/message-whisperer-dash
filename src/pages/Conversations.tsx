import { useState, useEffect, useCallback } from "react";
import { apiRequest, ApiError, getConversations, ConversationSummary } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { TicketQueue } from "@/components/cockpit/TicketQueue";
import { ActiveChat } from "@/components/cockpit/ActiveChat";
import { Ticket } from "@/components/cockpit/TicketCard";
import { Message } from "@/components/cockpit/ChatMessages";
import { Bug } from "lucide-react"; // Icon for debug

// --- SMART EXTRACTOR LOGIC ---
// This function hunts for the message array in any likely API structure
function extractMessagesFromResponse(response: any): { messages: Message[], source: string, raw: any } {
  let msgs: any[] = [];
  let source = "not_found";

  // Case 1: Standard SaaS Response { success: true, data: { messages: [...] } }
  if (Array.isArray(response?.data?.messages)) {
    msgs = response.data.messages;
    source = "response.data.messages";
  }
  // Case 2: Direct Object { messages: [...] }
  else if (Array.isArray(response?.messages)) {
    msgs = response.messages;
    source = "response.messages";
  }
  // Case 3: Direct Array [...]
  else if (Array.isArray(response)) {
    msgs = response;
    source = "root_array";
  }
  // Case 4: Envelope with data array { data: [...] }
  else if (Array.isArray(response?.data)) {
    msgs = response.data;
    source = "response.data";
  }
  // Case 5: Deeply nested items (Pagination) { data: { items: [...] } }
  else if (Array.isArray(response?.data?.items)) {
    msgs = response.data.items;
    source = "response.data.items";
  }

  // NORMALIZE: Ensure every message has 'text' so the UI doesn't break
  const normalized = msgs.map(m => ({
    ...m,
    text: m.text || m.content || m.body || "", // Ensure text exists
    timestamp: m.timestamp || m.created_at || new Date().toISOString() // Ensure timestamp exists
  }));

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
  
  // DEBUG STATE
  const [showDebug, setShowDebug] = useState(false);
  const [lastApiResponse, setLastApiResponse] = useState<any>(null);
  const [extractionSource, setExtractionSource] = useState<string>("");

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

  // Fetch on mount, filter change, or business change
  useEffect(() => {
    setSelectedTicket(null);
    setOptimisticMessages([]);
    fetchInitial();
  }, [filter, businessId]);

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
      
      try {
        // Fetch raw response
        const rawResponse = await apiRequest<any>(
          `/api/v1/conversations/${selectedTicket._id}`
        );

        // Use Smart Extractor
        const { messages, source, raw } = extractMessagesFromResponse(rawResponse);
        
        // Save for Debug Panel
        setLastApiResponse(raw);
        setExtractionSource(source);
        
        console.log(`[Cockpit] Extracted ${messages.length} messages from ${source}`);
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
        method: "PATCH",
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
      apiRequest(`/api/v1/conversations/${ticketId}/send`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    onMutate: async ({ message }) => {
      const newMessage: Message = {
        id: `optimistic-${Date.now()}`,
        content: message,
        text: message, // Ensure text is present
        sender: "agent",
        timestamp: new Date().toISOString(),
        status: "sending"
      };
      setOptimisticMessages((prev) => [...prev, newMessage]);
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
    <div className="h-[calc(100vh-4rem)] flex relative">
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

        {/* --- DEBUG OVERLAY (Bottom Right) --- */}
        {selectedTicket && (
          <div className="absolute bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
             {/* Toggle Button (Clickable) */}
             <div 
               onClick={() => setShowDebug(!showDebug)}
               className="pointer-events-auto bg-black/80 hover:bg-black text-white p-2 rounded-full cursor-pointer shadow-lg transition-all"
               title="Toggle Data Debugger"
             >
               <Bug className="w-5 h-5" />
             </div>

             {/* Debug Panel */}
             {showDebug && (
                <div className="pointer-events-auto w-[400px] h-[300px] bg-black/90 text-green-400 p-4 rounded-lg shadow-2xl overflow-auto text-xs font-mono border border-green-500/30 backdrop-blur-md">
                   <div className="font-bold border-b border-green-500/30 pb-2 mb-2 flex justify-between">
                     <span>API RESPONSE INSPECTOR</span>
                     <span className="text-white/50">Src: {extractionSource}</span>
                   </div>
                   
                   <div className="mb-2">
                      <span className="text-white">Messages Found:</span> {allMessages.length}
                   </div>

                   <div className="mb-2">
                      <span className="text-white">Raw API Payload:</span>
                      <pre className="mt-1 text-[10px] text-gray-300 whitespace-pre-wrap break-all">
                        {lastApiResponse ? JSON.stringify(lastApiResponse, null, 2) : "Waiting for response..."}
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
