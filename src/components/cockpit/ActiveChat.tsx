import { MessageSquare } from "lucide-react";
import { Ticket } from "./TicketCard";
import { ChatHeader } from "./ChatHeader";
import { ChatMessages, Message } from "./ChatMessages";
import { MessageInput } from "./MessageInput";

interface ActiveChatProps {
  ticket: Ticket | null;
  messages: Message[] | undefined;
  isLoadingMessages: boolean;
  isMessagesError: boolean;
  isAssigning: boolean;
  isResolving: boolean;
  isSending: boolean;
  onAssign: () => void;
  onResolve: () => void;
  onSendMessage: (message: string) => void;
}

export function ActiveChat({
  ticket,
  messages,
  isLoadingMessages,
  isMessagesError,
  isAssigning,
  isResolving,
  isSending,
  onAssign,
  onResolve,
  onSendMessage,
}: ActiveChatProps) {
  if (!ticket) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/10">
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

      <ChatMessages
        messages={messages}
        isLoading={isLoadingMessages}
        isError={isMessagesError}
      />

      <MessageInput
        onSend={onSendMessage}
        isSending={isSending}
        disabled={isLoadingMessages}
      />
    </div>
  );
}
