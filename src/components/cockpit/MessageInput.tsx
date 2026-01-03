import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Bot, Pause } from "lucide-react";

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

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Determine AI status display
  const isAiActive = aiEnabled === true && aiPausedBy === null && !hasAgentSent;
  const showAiPaused = aiPausedBy !== null || hasAgentSent;

  return (
    <div className="p-3 border-t border-border bg-muted/20">
      {/* AI Status indicator */}
      <div className="mb-2 px-1">
        {isAiActive ? (
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <Bot className="h-3 w-3" />
            <span>AI is active for this conversation</span>
          </div>
        ) : showAiPaused ? (
          <div className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
            <Pause className="h-3 w-3" />
            <span>AI paused by agent</span>
          </div>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-[44px] max-h-[120px] resize-none"
          disabled={disabled || isSending}
        />
        <Button
          onClick={handleSend}
          disabled={disabled || isSending || !message.trim()}
          size="icon"
          className="h-11 w-11 shrink-0"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
