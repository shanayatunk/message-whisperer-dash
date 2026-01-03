import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, useCallback } from "react";
import { SecureImage } from "./SecureImage";
import { ChevronDown, Check, CheckCheck, UserRound, Bot, Megaphone } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export interface Message {
  id?: string;
  _id?: string;
  content?: string; // Made optional
  text?: string;    // Added text support
  sender?: "user" | "agent" | "bot"; // Optional
  direction?: "inbound" | "outbound";
  timestamp?: string;
  created_at?: string;
  image_media_id?: string;
  status?: MessageStatus;
  source?: "customer" | "bot" | "agent" | "system" | "broadcast";
}

interface ChatMessagesProps {
  messages: Message[] | undefined;
  isLoading: boolean;
  isError: boolean;
  isAgentTyping?: boolean;
}

function cleanContent(content: string): string {
  if (!content) return "";
  try {
    // Handle potential JSON strings from older legacy data
    if (content.startsWith("{") || content.startsWith("[")) {
      const parsed = JSON.parse(content);
      if (parsed?.body) return parsed.body;
      if (parsed?.text?.body) return parsed.text.body;
    }
  } catch {
    // Not JSON, return as is
  }
  return content;
}

function extractVisualSearchMediaId(content: string): string | null {
  if (!content) return null;
  const match = content.match(/visual_search_(\d+)_caption_/);
  return match ? match[1] : null;
}

function isVisualSearchContent(content: string): boolean {
  return content ? content.includes("visual_search_") : false;
}

function isAgentEntryMessage(content: string, direction?: string): boolean {
  if (direction !== "outbound" || !content) return false;
  return content.startsWith("👋 Hi, I'm");
}

const normalizeUTC = (dateStr: string) =>
  dateStr && dateStr.endsWith("Z") ? dateStr : `${dateStr}Z`;

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
    <div className="flex justify-start">
      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1 shadow-sm">
        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
      </div>
    </div>
  );
}

function DeliveryStatus({ status }: { status?: MessageStatus }) {
  if (!status || status === "sending") {
    return <Check className="h-3 w-3 text-zinc-400" />;
  }
  if (status === "sent") {
    return <Check className="h-3 w-3 text-zinc-400" />;
  }
  if (status === "delivered") {
    return <CheckCheck className="h-3 w-3 text-zinc-400" />;
  }
  // read
  return <CheckCheck className="h-3 w-3 text-blue-500" />;
}

export function ChatMessages({ messages, isLoading, isError, isAgentTyping }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Auto-scroll logic
  useEffect(() => {
    if (messages?.length) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAgentTyping]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
            <Skeleton className={cn("h-16 w-[60%] rounded-2xl", i % 2 === 0 ? "rounded-tl-none" : "rounded-tr-none")} />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50/50">
        <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">Failed to load messages</p>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-zinc-50/50">
        <div className="bg-zinc-100 p-4 rounded-full mb-4">
          <Megaphone className="h-8 w-8 opacity-20" />
        </div>
        <p className="text-sm font-medium">No messages yet</p>
        <p className="text-xs opacity-70 mt-1">Start the conversation below</p>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden bg-[#efe7dd] dark:bg-[#0b141a]"> {/* WhatsApp-like Background Color */}
      {/* Optional: Add a subtle background pattern image here via CSS if desired */}
      
      <ScrollArea className="h-full px-2" ref={scrollRef} onScrollCapture={handleScroll}>
        <div className="py-4 space-y-2 px-2">
          {messages.map((msg, idx) => {
            // Determine Direction
            const isInbound = msg.direction 
              ? msg.direction === "inbound" 
              : msg.sender === "user";
            
            // Get Dates
            const time = msg.timestamp || msg.created_at;
            const msgDate = getMessageDate(msg);
            
            // Date Separator Logic
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const prevDate = prevMsg ? getMessageDate(prevMsg) : null;
            const showDateSeparator = !prevDate || !isSameDay(msgDate, prevDate);

            // Content Extraction (Support text OR content)
            const rawContent = msg.text || msg.content || "";
            const visualSearchMediaId = extractVisualSearchMediaId(rawContent);
            const hasVisualSearch = isVisualSearchContent(rawContent);
            const textToShow = cleanContent(rawContent);

            // System Message Check
            const isSystemMessage = msg.source === "system" || isAgentEntryMessage(rawContent, msg.direction);
            const isBroadcast = msg.source === "broadcast";

            return (
              <div key={msg.id || msg._id || idx} className="flex flex-col">
                {/* Date Separator */}
                {showDateSeparator && (
                  <div className="flex justify-center my-4 sticky top-2 z-10">
                    <span className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm text-zinc-500 text-[11px] font-medium px-3 py-1 rounded-full shadow-sm border border-zinc-100 dark:border-zinc-700">
                      {formatDateSeparator(msgDate)}
                    </span>
                  </div>
                )}
                
                {/* System Message Banner */}
                {isSystemMessage ? (
                  <div className="flex justify-center my-2">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs px-3 py-1.5 rounded-md flex items-center gap-2 border border-yellow-100 dark:border-yellow-800/50">
                      <UserRound className="h-3 w-3" />
                      <span>{textToShow}</span>
                    </div>
                  </div>
                ) : (
                  /* Standard Message Bubble */
                  <div className={cn("flex w-full mb-1", isInbound ? "justify-start" : "justify-end")}>
                    <div
                      className={cn(
                        "relative max-w-[85%] sm:max-w-[70%] px-3 py-2 text-[15px] leading-relaxed shadow-sm",
                        isInbound
                          ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-tl-none" 
                          : "bg-[#d9fdd3] dark:bg-[#005c4b] text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-tr-none"
                      )}
                    >
                      {/* Image Attachment */}
                      {msg.image_media_id && (
                        <SecureImage
                          mediaId={msg.image_media_id}
                          alt="Attachment"
                          className="mb-2 rounded-lg w-full max-w-[240px]"
                        />
                      )}
                      
                      {/* Visual Search Image */}
                      {!msg.image_media_id && hasVisualSearch && visualSearchMediaId && (
                        <SecureImage
                          mediaId={visualSearchMediaId}
                          alt="Visual Search"
                          className="mb-2 rounded-lg w-full max-w-[240px]"
                        />
                      )}

                      {/* Message Text */}
                      {!hasVisualSearch && textToShow && (
                        <p className="whitespace-pre-wrap break-words">{textToShow}</p>
                      )}

                      {/* Metadata Row (Time + Status) */}
                      <div className={cn(
                        "flex items-center gap-1 mt-1 select-none",
                        isInbound ? "justify-end" : "justify-end"
                      )}>
                        {/* Source Indicators */}
                        {!isInbound && (
                          <>
                            {isBroadcast && <Megaphone className="h-3 w-3 text-purple-500" />}
                            {msg.source === "bot" && <Bot className="h-3 w-3 text-emerald-600 opacity-70" />}
                            {msg.source === "agent" && <UserRound className="h-3 w-3 text-blue-600 opacity-70" />}
                          </>
                        )}
                        
                        {/* Timestamp */}
                        {time && (
                          <span className={cn(
                            "text-[10px]",
                            isInbound ? "text-zinc-400" : "text-emerald-900/60 dark:text-emerald-100/60"
                          )}>
                            {new Date(normalizeUTC(time)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        
                        {/* Read Receipt (Only for outbound) */}
                        {!isInbound && <DeliveryStatus status={msg.status} />}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Typing Indicator */}
          {isAgentTyping && <TypingIndicator />}
          
          {/* Invisible div to scroll to */}
          <div ref={bottomRef} className="h-2" />
        </div>
      </ScrollArea>
      
      {/* "Scroll to Bottom" Button (Only shows when scrolled up) */}
      {showScrollButton && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-4 right-4 h-9 w-9 rounded-full shadow-lg bg-white/90 hover:bg-white text-zinc-600 border border-zinc-200 z-20"
          onClick={scrollToBottom}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
