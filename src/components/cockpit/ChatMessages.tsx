import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { SecureImage } from "./SecureImage";

export interface Message {
  id?: string;
  _id?: string;
  content: string;
  sender: "user" | "agent" | "bot";
  timestamp?: string;
  created_at?: string;
  image_media_id?: string;
}

interface ChatMessagesProps {
  messages: Message[] | undefined;
  isLoading: boolean;
  isError: boolean;
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

export function ChatMessages({ messages, isLoading, isError }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
    <ScrollArea className="flex-1" ref={scrollRef}>
      <div className="p-4 space-y-3">
        {messages.map((msg, idx) => {
          const isUser = msg.sender === "user";
          const time = msg.timestamp || msg.created_at;
          
          return (
            <div
              key={msg.id || msg._id || idx}
              className={cn("flex", isUser ? "justify-start" : "justify-end")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                  isUser
                    ? "bg-muted text-foreground"
                    : "bg-primary text-primary-foreground"
                )}
              >
                {/* Image first, then text */}
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
                  <p className={cn(
                    "text-xs mt-1 opacity-70",
                    isUser ? "text-muted-foreground" : "text-primary-foreground/70"
                  )}>
                    {new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
