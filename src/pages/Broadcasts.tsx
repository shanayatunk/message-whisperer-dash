import { useState, useMemo } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { apiRequest, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Radio, Loader2, Send, AlertTriangle } from "lucide-react";

const templates = [
  { id: "hello_world", name: "Hello World" },
  { id: "order_update", name: "Order Update" },
];

interface BroadcastResult {
  sent: number;
  failed: number;
  dry_run: boolean;
}

export default function Broadcasts() {
  const { businessId } = useBusiness();
  const { toast } = useToast();

  const [template, setTemplate] = useState("");
  const [recipients, setRecipients] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [confirmText, setConfirmText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // Parse and count valid phone numbers
  const recipientList = useMemo(() => {
    return recipients
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [recipients]);

  const recipientCount = recipientList.length;
  const requiresConfirmation = recipientCount > 1;
  const isConfirmed = confirmText === "CONFIRM_BROADCAST";
  const canSubmit =
    template &&
    recipientCount > 0 &&
    (!requiresConfirmation || isConfirmed);

  const handleSend = async () => {
    if (!canSubmit) return;

    setIsLoading(true);

    try {
      const response = await apiRequest<BroadcastResult>("/admin/broadcast", {
        method: "POST",
        body: JSON.stringify({
          business_id: businessId,
          template_name: template,
          recipients: recipientList,
          dry_run: dryRun,
        }),
      });

      setResult(response);
      setShowResultModal(true);

      // Reset form on success
      if (!dryRun) {
        setRecipients("");
        setConfirmText("");
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Broadcast failed";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Radio className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Broadcasts</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Send Broadcast Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Business (read-only) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Business</Label>
            <div className="h-9 px-3 py-2 rounded-md border border-input bg-muted text-sm">
              {businessId === "feelori" ? "Feelori" : "Golden Collections"}
            </div>
          </div>

          {/* Template Selector */}
          <div className="space-y-2">
            <Label htmlFor="template" className="text-sm font-medium">
              Template
            </Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recipients Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="recipients" className="text-sm font-medium">
                Recipients
              </Label>
              <Badge variant={recipientCount > 0 ? "default" : "secondary"}>
                {recipientCount} recipient{recipientCount !== 1 ? "s" : ""}
              </Badge>
            </div>
            <Textarea
              id="recipients"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="Enter phone numbers (one per line)&#10;+1234567890&#10;+0987654321"
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              One phone number per line, including country code
            </p>
          </div>

          {/* Dry Run Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="dry-run" className="text-sm font-medium">
                Dry Run
              </Label>
              <p className="text-xs text-muted-foreground">
                Simulate the broadcast without actually sending messages
              </p>
            </div>
            <Switch
              id="dry-run"
              checked={dryRun}
              onCheckedChange={setDryRun}
            />
          </div>

          {/* Confirmation Input (when > 1 recipient) */}
          {requiresConfirmation && (
            <div className="space-y-2 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <Label className="text-sm font-medium">
                  Confirmation Required
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                You are about to send to {recipientCount} recipients. Type{" "}
                <code className="px-1 py-0.5 bg-muted rounded text-xs font-mono">
                  CONFIRM_BROADCAST
                </code>{" "}
                to proceed.
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type CONFIRM_BROADCAST"
                className={
                  confirmText && !isConfirmed
                    ? "border-destructive"
                    : isConfirmed
                    ? "border-green-500"
                    : ""
                }
              />
            </div>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!canSubmit || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {dryRun ? "Send (Dry Run)" : "Send Broadcast"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result Modal */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Broadcast Result</DialogTitle>
            <DialogDescription>
              Summary of your broadcast operation
            </DialogDescription>
          </DialogHeader>

          {result && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {result.sent}
                  </div>
                  <div className="text-xs text-muted-foreground">Sent</div>
                </div>
                <div className="rounded-lg border border-border p-4 text-center">
                  <div className="text-2xl font-bold text-destructive">
                    {result.failed}
                  </div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-muted-foreground">Dry Run:</span>
                <Badge variant={result.dry_run ? "secondary" : "default"}>
                  {result.dry_run ? "Yes" : "No"}
                </Badge>
              </div>

              {result.dry_run && (
                <p className="text-xs text-center text-muted-foreground">
                  This was a dry run. No messages were actually sent.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowResultModal(false)} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
