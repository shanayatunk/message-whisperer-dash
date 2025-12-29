import { useState, useEffect } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { apiRequest, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Radio, Loader2, Send, RefreshCw, History, Megaphone, Eye, Smartphone } from "lucide-react";
import { format } from "date-fns";

// Types for API responses
interface Template {
  id: string;
  name: string;
  header?: string;
  body?: string;
}

interface Audience {
  id: string;
  name: string;
  count?: number;
}

interface BroadcastConfig {
  allowed_templates: Template[];
  audiences: Audience[];
}

interface BroadcastJob {
  id: string;
  created_at: string;
  template_name: string;
  audience_name: string;
  sent_count: number;
  status: "pending" | "processing" | "completed" | "failed";
}

interface BroadcastResult {
  sent: number;
  failed: number;
  job_id?: string;
}

export default function Broadcasts() {
  const { businessId } = useBusiness();
  const { toast } = useToast();

  // Config state
  const [config, setConfig] = useState<BroadcastConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  // History state
  const [history, setHistory] = useState<BroadcastJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedAudience, setSelectedAudience] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);

  // Test dialog state
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Dynamic template inputs
  const [headerMediaUrl, setHeaderMediaUrl] = useState("");
  const [buttonSuffix, setButtonSuffix] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  // Fetch config on mount
  useEffect(() => {
    if (!businessId) return;
    fetchConfig();
    fetchHistory();
  }, [businessId]);

  const fetchConfig = async () => {
    setConfigLoading(true);
    try {
      const response = await apiRequest<any>(
        `/api/v1/broadcasts/config?business_id=${businessId}`
      );
      
      // FIX: Look inside 'response.data' first, then fallback to 'response'
      const payload = response.data || response;
      
      // 1. Get the raw list
      const rawTemplates = payload.templates || payload.allowed_templates || [];
      
      // 2. Transform strings into objects
      const allowed_templates = rawTemplates.map((t: any) => {
        if (typeof t === 'string') {
          return {
            id: t,
            name: t
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase())
          };
        }
        return t;
      });
      
      // 3. Set State
      const audiences = Array.isArray(payload.audiences) ? payload.audiences : [];
      setConfig({ allowed_templates, audiences });
    } catch (error) {
      console.error("Config fetch error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load config",
      });
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await apiRequest<any>(
        `/api/v1/broadcasts/history?business_id=${businessId}`
      );
      
      // FIX: Look inside 'response.data' first, then fallback to 'response'
      const data = response.data || response;
      
      // Safely extract jobs array from various response structures
      let jobs: BroadcastJob[] = [];
      if (Array.isArray(data)) {
        // Handle Tuple: [[job1, job2], {pagination}]
        if (data.length > 0 && Array.isArray(data[0])) {
          jobs = data[0];
        } else {
          jobs = data; // It's just a flat array
        }
      } else if (data?.jobs && Array.isArray(data.jobs)) {
        // Handle Object: { jobs: [...], pagination: ... }
        jobs = data.jobs;
      }
      setHistory(jobs);
    } catch (error) {
      console.error("History fetch error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load history",
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSendClick = () => {
    if (!selectedTemplate || !selectedAudience) return;
    setShowConfirmDialog(true);
  };

  const handleTestClick = () => {
    if (!selectedTemplate) return;
    setShowTestDialog(true);
  };

  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a phone number",
      });
      return;
    }

    setIsSendingTest(true);
    try {
      await apiRequest("/api/v1/broadcasts/send", {
        method: "POST",
        body: JSON.stringify({
          business_id: businessId,
          template_name: selectedTemplate,
          audience_type: "custom",
          is_test: true,
          test_phone: testPhone.trim(),
          params: getTemplatePayload(),
        }),
      });

      toast({
        title: "Test Sent",
        description: "Test message sent! Check your phone.",
      });
      setShowTestDialog(false);
      setTestPhone("");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to send test";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleConfirmSend = async () => {
    setShowConfirmDialog(false);
    setIsSending(true);

    try {
      const response = await apiRequest<BroadcastResult>("/api/v1/broadcasts/send", {
        method: "POST",
        body: JSON.stringify({
          business_id: businessId,
          template_name: selectedTemplate,
          audience_type: selectedAudience,
          params: getTemplatePayload(),
        }),
      });

      setResult(response);
      setShowResultModal(true);

      // Reset form and refresh history
      setSelectedTemplate("");
      setSelectedAudience("");
      resetDynamicInputs();
      fetchHistory();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Broadcast failed";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    } finally {
      setIsSending(false);
    }
  };

  // Get selected template details for preview
  const selectedTemplateData = config?.allowed_templates?.find(
    (t) => t.id === selectedTemplate
  );

  // Get selected audience details
  const selectedAudienceData = config?.audiences?.find(
    (a) => a.id === selectedAudience
  );

  // Reset dynamic inputs when template changes
  const resetDynamicInputs = () => {
    setHeaderMediaUrl("");
    setButtonSuffix("");
    setDiscountPercent("");
    setCouponCode("");
    setExpiryDate("");
  };

  // Build template-specific payload
  const getTemplatePayload = () => {
    switch (selectedTemplate) {
      case "new_arrival_showcase":
        return {
          header_image_url: headerMediaUrl,
          button_url_suffix: buttonSuffix,
          body_params: ["{{name}}"],
        };
      case "video_collection_launch":
        return {
          header_video_url: headerMediaUrl,
          button_url_suffix: buttonSuffix,
          body_params: ["{{name}}"],
        };
      case "festival_sale_alert":
        return {
          body_params: ["{{name}}", discountPercent, couponCode, expiryDate],
          button_url_suffix: buttonSuffix,
        };
      case "gentle_greeting_v1":
        return {
          body_params: ["{{name}}"],
        };
      default:
        return {};
    }
  };

  // Render dynamic inputs based on selected template
  const renderDynamicInputs = () => {
    switch (selectedTemplate) {
      case "new_arrival_showcase":
        return (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <Label htmlFor="header-image" className="text-sm font-medium">
                Header Image URL
              </Label>
              <Input
                id="header-image"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={headerMediaUrl}
                onChange={(e) => setHeaderMediaUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="link-suffix" className="text-sm font-medium">
                  Link Suffix
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-muted-foreground cursor-help">(?)</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Appended to your base URL (e.g., 'collections/new')</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="link-suffix"
                type="text"
                placeholder="collections/new"
                value={buttonSuffix}
                onChange={(e) => setButtonSuffix(e.target.value)}
              />
            </div>
          </div>
        );
      case "video_collection_launch":
        return (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <Label htmlFor="header-video" className="text-sm font-medium">
                Header Video URL
              </Label>
              <Input
                id="header-video"
                type="url"
                placeholder="https://example.com/video.mp4"
                value={headerMediaUrl}
                onChange={(e) => setHeaderMediaUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="link-suffix-video" className="text-sm font-medium">
                  Link Suffix
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-muted-foreground cursor-help">(?)</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Appended to your base URL (e.g., 'collections/sale')</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="link-suffix-video"
                type="text"
                placeholder="collections/sale"
                value={buttonSuffix}
                onChange={(e) => setButtonSuffix(e.target.value)}
              />
            </div>
          </div>
        );
      case "festival_sale_alert":
        return (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount" className="text-sm font-medium">
                  Discount %
                </Label>
                <Input
                  id="discount"
                  type="text"
                  placeholder="20"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon" className="text-sm font-medium">
                  Coupon Code
                </Label>
                <Input
                  id="coupon"
                  type="text"
                  placeholder="SALE20"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry" className="text-sm font-medium">
                Expiry Date
              </Label>
              <Input
                id="expiry"
                type="text"
                placeholder="Dec 31, 2024"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="link-suffix-sale" className="text-sm font-medium">
                  Link Suffix
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-muted-foreground cursor-help">(?)</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Appended to your base URL (e.g., 'collections/sale')</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="link-suffix-sale"
                type="text"
                placeholder="collections/sale"
                value={buttonSuffix}
                onChange={(e) => setButtonSuffix(e.target.value)}
              />
            </div>
          </div>
        );
      case "gentle_greeting_v1":
        return (
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              No additional inputs required for this template.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: BroadcastJob["status"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case "processing":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Processing</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const canSubmit = selectedTemplate && selectedAudience && !isSending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Radio className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Broadcasts</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section A: Campaign History */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-4 w-4" />
                Campaign History
              </CardTitle>
              <CardDescription>Past broadcast campaigns and their status</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHistory}
              disabled={historyLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${historyLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No campaigns sent yet
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead className="text-right">Sent</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history?.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="text-sm">
                          {format(new Date(job.created_at), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium">{job.template_name}</TableCell>
                        <TableCell>{job.audience_name}</TableCell>
                        <TableCell className="text-right">{job.sent_count}</TableCell>
                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section B: Create Campaign */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Create Campaign
            </CardTitle>
            <CardDescription>Send approved templates to your audience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {configLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !config ? (
              <div className="text-center py-8 text-muted-foreground">
                Failed to load configuration
              </div>
            ) : (
              <>
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
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger id="template">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {config.allowed_templates?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dynamic Template Inputs */}
                {selectedTemplate && renderDynamicInputs()}

                {/* Audience Selector */}
                <div className="space-y-2">
                  <Label htmlFor="audience" className="text-sm font-medium">
                    Audience
                  </Label>
                  <Select value={selectedAudience} onValueChange={setSelectedAudience}>
                    <SelectTrigger id="audience">
                      <SelectValue placeholder="Select an audience" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {config.audiences?.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          <span>{a.name}</span>
                          {a.count !== undefined && (
                            <span className="ml-2 text-muted-foreground text-xs">
                              ({a.count.toLocaleString()} users)
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={handleTestClick}
                          disabled={!selectedTemplate || isSending}
                        >
                          <Smartphone className="mr-2 h-4 w-4" />
                          Send Test
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Send a preview to your own phone</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <Button
                    onClick={handleSendClick}
                    disabled={!canSubmit}
                    className="flex-1"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Campaign
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Template Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Template Preview
            </CardTitle>
            <CardDescription>Preview of the selected template</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedTemplateData ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Select a template to preview
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                {selectedTemplateData.header && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Header
                    </span>
                    <p className="text-sm font-medium mt-1">{selectedTemplateData.header}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Body
                  </span>
                  <p className="text-sm mt-1">
                    {selectedTemplateData.body || "Template body content will appear here..."}
                  </p>
                </div>
                <div className="pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Template ID: {selectedTemplateData.id}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Broadcast</AlertDialogTitle>
            <AlertDialogDescription>
              Send "{selectedTemplateData?.name}" to {selectedAudienceData?.name}
              {selectedAudienceData?.count !== undefined && (
                <> ({selectedAudienceData.count.toLocaleString()} recipients)</>
              )}
              ? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend}>
              Yes, Send Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Result Modal */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Campaign Sent</DialogTitle>
            <DialogDescription>
              Your broadcast campaign has been queued
            </DialogDescription>
          </DialogHeader>

          {result && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {result.sent}
                  </div>
                  <div className="text-xs text-muted-foreground">Messages Queued</div>
                </div>
                <div className="rounded-lg border border-border p-4 text-center">
                  <div className="text-2xl font-bold text-destructive">
                    {result.failed}
                  </div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>

              {result.job_id && (
                <p className="text-xs text-center text-muted-foreground">
                  Job ID: {result.job_id}
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

      {/* Test Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Test Message</DialogTitle>
            <DialogDescription>
              Send a preview of "{selectedTemplateData?.name}" to your phone
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-phone">Test Phone Number</Label>
              <Input
                id="test-phone"
                type="tel"
                placeholder="+1234567890"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter your phone number with country code
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowTestDialog(false)}
              disabled={isSendingTest}
            >
              Cancel
            </Button>
            <Button onClick={handleSendTest} disabled={isSendingTest || !testPhone.trim()}>
              {isSendingTest ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Smartphone className="mr-2 h-4 w-4" />
                  Send Preview
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
