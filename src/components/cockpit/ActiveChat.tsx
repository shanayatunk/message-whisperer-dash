import { MessageSquare } from "lucide-react";
import { Ticket } from "./TicketCard";
import { ChatHeader } from "./ChatHeader";
import { ChatMessages, Message } from "./ChatMessages";
import { MessageInput } from "./MessageInput";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

interface ActiveChatProps {
  ticket: Ticket | null;
  messages: Message[] | undefined;
  isLoadingMessages: boolean;
  isMessagesError: boolean;
  isAssigning: boolean;
  isResolving: boolean;
  isSending: boolean;
  isAgentTyping?: boolean;
  hasAgentSent?: boolean;
  isTogglingAi?: boolean;
  onAssign: (userId: string) => void;
  onResolve: () => void;
  onSendMessage: (message: string) => void;
  onTicketUpdate?: () => void;
  onToggleAi?: (enabled: boolean) => void;
}

interface ConversationStatusBannerProps {
  status: string;
  onTakeOver?: () => void;
  canTakeOver?: boolean;
  onRelease?: () => void;
  isReleasing?: boolean;
}

function ConversationStatusBanner({ status, onTakeOver, canTakeOver, onRelease, isReleasing }: ConversationStatusBannerProps) {
  if (status === "human_needed") {
    return (
      <div className="w-full px-4 py-2 bg-amber-100 text-amber-800 text-center text-sm flex items-center justify-center">
        <span>👨‍💻 Human Support Active - Bot is paused for this chat.</span>
        {onRelease && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRelease}
            disabled={isReleasing}
            className="ml-4 h-7 text-xs border-orange-200 hover:bg-orange-50 text-orange-700"
          >
            🤖 Release to Bot
          </Button>
        )}
      </div>
    );
  }

  if (status === "resolved") {
    return (
      <div className="w-full px-4 py-2 bg-emerald-100 text-emerald-800 text-center text-sm">
        ✅ This conversation is resolved.
      </div>
    );
  }

  // Default: pending or other statuses
  return (
    <div className="w-full px-4 py-2 bg-muted text-muted-foreground text-center text-sm flex items-center justify-center">
      <span>🤖 Bot is handling this conversation.</span>
      {canTakeOver && onTakeOver && (
        <Button
          variant="outline"
          size="sm"
          onClick={onTakeOver}
          className="ml-4 h-7 text-xs bg-background hover:bg-accent"
        >
          ✋ Take Over
        </Button>
      )}
    </div>
  );
}

export function ActiveChat({
  ticket,
  messages,
  isLoadingMessages,
  isMessagesError,
  isAssigning,
  isResolving,
  isSending,
  isAgentTyping,
  hasAgentSent,
  isTogglingAi,
  onAssign,
  onResolve,
  onSendMessage,
  onTicketUpdate,
  onToggleAi,
}: ActiveChatProps) {
  const { user } = useAuth();
  const [isReleasing, setIsReleasing] = useState(false);

  if (!ticket) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/10">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a ticket to start</p>
        </div>
      </div>
    );
  }

  const handleTakeOver = () => {
    if (user) {
      onAssign(user.id || user.username || "");
      onTicketUpdate?.();
    }
  };

  const handleResolve = () => {
    onResolve();
    onTicketUpdate?.();
  };

  const handleRelease = async () => {
    if (!window.confirm("Release this conversation back to the bot?")) return;

    setIsReleasing(true);
    try {
      await apiRequest(`/api/v1/conversations/${ticket._id}/release`, {
        method: "POST",
      });
      toast({
        title: "Conversation released",
        description: "The bot will now handle this conversation.",
      });
      onTicketUpdate?.();
    } catch (error) {
      toast({
        title: "Failed to release",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <ChatHeader
        ticket={ticket}
        isAssigning={isAssigning}
        isResolving={isResolving}
        isTogglingAi={isTogglingAi}
        onAssign={onAssign}
        onResolve={handleResolve}
        onToggleAi={onToggleAi}
      />

      <ConversationStatusBanner
        status={ticket.status}
        onTakeOver={handleTakeOver}
        canTakeOver={ticket.status === "pending" && !!user}
        onRelease={ticket.status === "human_needed" ? handleRelease : undefined}
        isReleasing={isReleasing}
      />

      <ChatMessages
        messages={messages}
        isLoading={isLoadingMessages}
        isError={isMessagesError}
        isAgentTyping={isAgentTyping}
      />

      <MessageInput
        onSend={onSendMessage}
        isSending={isSending}
        disabled={isLoadingMessages}
        aiEnabled={ticket.ai_enabled}
        aiPausedBy={ticket.ai_paused_by}
        hasAgentSent={hasAgentSent}
      />
    </div>
  );
}