import { MessageSquare, Bot, UserCheck, CheckCircle } from "lucide-react";
import { Ticket } from "./TicketCard";
import { ChatHeader } from "./ChatHeader";
import { ChatMessages, Message } from "./ChatMessages";
import { MessageInput } from "./MessageInput";
import { cn } from "@/lib/utils";

interface ActiveChatProps {
  ticket: Ticket | null;
  messages: Message[] | undefined;
  isLoadingMessages: boolean;
  isMessagesError: boolean;
  isAssigning: boolean;
  isResolving: boolean;
  isSending: boolean;
  isAgentTyping?: boolean;
  onAssign: (userId: string) => void;
  onResolve: () => void;
  onSendMessage: (message: string) => void;
}

function ConversationStatusBanner({ status }: { status: string }) {
  if (status === "human_needed") {
    return (
      <div className="w-full px-4 py-2 bg-amber-100 text-amber-800 text-center text-sm">
        👨‍💻 Human Support Active - Bot is paused for this chat.
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
    <div className="w-full px-4 py-2 bg-muted text-muted-foreground text-center text-sm">
      🤖 Bot is handling this conversation.
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
  onAssign,
  onResolve,
  onSendMessage,
}: ActiveChatProps) {
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

  return (
    <div className="flex-1 flex flex-col h-full">
      <ChatHeader
        ticket={ticket}
        isAssigning={isAssigning}
        isResolving={isResolving}
        onAssign={onAssign}
        onResolve={onResolve}
      />

      <ConversationStatusBanner status={ticket.status} />

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
      />
    </div>
  );
}