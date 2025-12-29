import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, useCallback } from "react";
import { SecureImage } from "./SecureImage";
import { ChevronDown, Check, CheckCheck } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export interface Message {
  id?: string;
  _id?: string;
  content: string;
  sender: "user" | "agent" | "bot";
  timestamp?: string;
  created_at?: string;
  image_media_id?: string;
  status?: MessageStatus;
}

interface ChatMessagesProps {
  messages: Message[] | undefined;
  isLoading: boolean;
  isError: boolean;
  isAgentTyping?: boolean;
}

function cleanContent(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.body) return parsed.body;
    if (parsed?.text?.body) return parsed.text.body;
  } catch {
    // Not JSON
  }
  return content;
}

const normalizeUTC = (dateStr: string) =>
  dateStr.endsWith("Z") ? dateStr : `${dateStr}Z`;

function getMessageDate(msg: Message): Date {
  const time = msg.timestamp || msg.created_at;
  return time ? new Date(normalizeUTC(time)) : new Date();
}

function formatDateSeparator(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d, yyyy");
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-end">
      <div className="bg-primary/80 rounded-lg px-4 py-3 flex items-center gap-1">
        <span className="w-2 h-2 bg-primary-foreground/70 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 bg-primary-foreground/70 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 bg-primary-foreground/70 rounded-full animate-bounce" />
      </div>
    </div>
  );
}

function DeliveryStatus({ status }: { status?: MessageStatus }) {
  if (!status || status === "sending") {
    return <Check className="h-3 w-3 text-primary-foreground/50" />;
  }
  if (status === "sent") {
    return <Check className="h-3 w-3 text-primary-foreground/70" />;
  }
  if (status === "delivered") {
    return <CheckCheck className="h-3 w-3 text-primary-foreground/70" />;
  }
  // read
  return <CheckCheck className="h-3 w-3 text-sky-300" />;
}

export function ChatMessages({ messages, isLoading, isError, isAgentTyping }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
            <Skeleton className="h-12 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-destructive">Failed to load messages</p>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No messages yet</p>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden">
      <ScrollArea className="h-full" ref={scrollRef} onScrollCapture={handleScroll}>
        <div className="p-4 space-y-3">
          {messages.map((msg, idx) => {
            const isUser = msg.sender === "user";
            const time = msg.timestamp || msg.created_at;
            const msgDate = getMessageDate(msg);
            
            // Check if we need a date separator
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const prevDate = prevMsg ? getMessageDate(prevMsg) : null;
            const showDateSeparator = !prevDate || !isSameDay(msgDate, prevDate);

            return (
              <div key={msg.id || msg._id || idx}>
                {showDateSeparator && (
                  <div className="flex justify-center my-4">
                    <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
                      {formatDateSeparator(msgDate)}
                    </span>
                  </div>
                )}
                <div className={cn("flex", isUser ? "justify-start" : "justify-end")}>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                      isUser
                        ? "bg-muted text-foreground"
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    {msg.image_media_id && (
                      <SecureImage
                        mediaId={msg.image_media_id}
                        alt="Message attachment"
                        className="mb-2"
                      />
                    )}
                    {msg.content && (
                      <p className="whitespace-pre-wrap break-words">{cleanContent(msg.content)}</p>
                    )}
                    {time && (
                      <div className={cn(
                        "flex items-center gap-1 mt-1",
                        isUser ? "justify-start" : "justify-end"
                      )}>
                        <span className={cn(
                          "text-xs opacity-70",
                          isUser ? "text-muted-foreground" : "text-primary-foreground/70"
                        )}>
                          {new Date(normalizeUTC(time)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!isUser && <DeliveryStatus status={msg.status} />}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {isAgentTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      
      {showScrollButton && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-4 right-4 rounded-full shadow-lg h-10 w-10"
          onClick={scrollToBottom}
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
