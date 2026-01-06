import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Bot, Pause, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface MessageInputProps {
  onSend: (message: string) => void;
  isSending: boolean;
  disabled?: boolean;
  aiEnabled?: boolean;
  aiPausedBy?: string | null;
  hasAgentSent?: boolean;
}

export function MessageInput({ 
  onSend, 
  isSending, 
  disabled,
  aiEnabled,
  aiPausedBy,
  hasAgentSent,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  // Auto-resize logic for textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit"; // Reset
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || isSending || disabled) return;
    onSend(trimmed);
    setMessage(""); // Clear input
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent newline
      handleSend();
    }
  };

  // Determine AI status display
  const isAiActive = aiEnabled === true && aiPausedBy === null && !hasAgentSent;
  const showAiPaused = aiPausedBy !== null || hasAgentSent;

  return (
    <div className={cn(
      "p-3 border-t border-border bg-white dark:bg-zinc-900",
      isMobile && "sticky bottom-0 z-10"
    )}>
      {/* AI Status Indicator */}
      <div className="mb-2 px-1 flex items-center justify-between">
        {isAiActive ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">
            <Sparkles className="h-3 w-3" />
            <span>AI Autopilot Active</span>
          </div>
        ) : showAiPaused ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md">
            <Pause className="h-3 w-3" />
            <span>AI Paused</span>
          </div>
        ) : <div />}
      </div>

      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send)"
          className="min-h-[44px] max-h-[120px] resize-none py-3 px-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus-visible:ring-1 focus-visible:ring-emerald-500"
          disabled={disabled || isSending}
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={disabled || isSending || !message.trim()}
          size="icon"
          className={cn(
            "h-11 w-11 shrink-0 rounded-xl transition-all",
            message.trim() ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400"
          )}
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5 ml-0.5" /> // Slight visual center fix
          )}
        </Button>
      </div>
      <div className="text-[10px] text-muted-foreground text-center mt-1 opacity-50">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}
