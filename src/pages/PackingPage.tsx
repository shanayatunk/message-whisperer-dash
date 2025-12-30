import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Search, Package } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PackingKanbanBoard } from "@/components/packing/PackingKanbanBoard";
import { PackingHoldDialog } from "@/components/packing/PackingHoldDialog";
import { PackingFulfillDialog } from "@/components/packing/PackingFulfillDialog";
import { packingApi, PackingOrder, PackingConfig } from "@/lib/packingApi";

const BUSINESS_OPTIONS = [
  { id: "feelori", label: "Feelori" },
  { id: "goldencollections", label: "GoldenCollections" },
  { id: "godjewellery9", label: "GodJewellery9" },
];

export default function PackingPage() {
  // State
  const [orders, setOrders] = useState<PackingOrder[]>([]);
  const [config, setConfig] = useState<PackingConfig>({ packers: [], carriers: [] });
  const [selectedBusiness, setSelectedBusiness] = useState("feelori");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Dialog state
  const [holdDialogOpen, setHoldDialogOpen] = useState(false);
  const [fulfillDialogOpen, setFulfillDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await packingApi.getOrders(selectedBusiness);
      setOrders(data);
    } catch (error) {
      toast({
        title: "Failed to fetch orders",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness]);

  // Fetch config
  const fetchConfig = useCallback(async () => {
    try {
      const data = await packingApi.getConfig(selectedBusiness);
      setConfig(data);
    } catch (error) {
      console.error("Failed to fetch config:", error);
    }
  }, [selectedBusiness]);

  // Initial fetch & refetch on business change
  useEffect(() => {
    fetchOrders();
    fetchConfig();
  }, [fetchOrders, fetchConfig]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOrders]);

  // Actions
  const handleStart = async (orderId: string) => {
    try {
      await packingApi.startOrder(selectedBusiness, orderId);
      toast({ title: "Order started", description: `Order ${orderId} is now in progress.` });
      fetchOrders();
    } catch (error) {
      toast({
        title: "Failed to start order",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleHoldClick = (orderId: string) => {
    setSelectedOrderId(orderId);
    setHoldDialogOpen(true);
  };

  const handleHoldSubmit = async (reason: string, notes: string) => {
    if (!selectedOrderId) return;
    try {
      await packingApi.holdOrder(selectedBusiness, selectedOrderId, reason, notes);
      toast({ title: "Order on hold", description: `Order ${selectedOrderId} placed on hold.` });
      setHoldDialogOpen(false);
      setSelectedOrderId(null);
      fetchOrders();
    } catch (error) {
      toast({
        title: "Failed to hold order",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleFulfillClick = (orderId: string) => {
    setSelectedOrderId(orderId);
    setFulfillDialogOpen(true);
  };

  const handleFulfillSubmit = async (packer: string, carrier: string, trackingNumber: string) => {
    if (!selectedOrderId) return;
    try {
      await packingApi.fulfillOrder(selectedBusiness, selectedOrderId, packer, carrier, trackingNumber);
      toast({ title: "Order fulfilled", description: `Order ${selectedOrderId} has been shipped.` });
      setFulfillDialogOpen(false);
      setSelectedOrderId(null);
      fetchOrders();
    } catch (error) {
      toast({
        title: "Failed to fulfill order",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Filter orders by search
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.order_id.toLowerCase().includes(query) ||
      order.customer_name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-6 w-6" />
            Packing Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage order fulfillment across all brands
          </p>
        </div>

        {/* Business Selector */}
        <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select business" />
          </SelectTrigger>
          <SelectContent>
            {BUSINESS_OPTIONS.map((biz) => (
              <SelectItem key={biz.id} value={biz.id}>
                {biz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters & Controls</CardTitle>
          <CardDescription>Search orders and configure auto-refresh</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Order ID or Customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Auto-refresh toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-sm">
                Auto-refresh (30s)
              </Label>
            </div>

            {/* Manual refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOrders}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <PackingKanbanBoard
        orders={filteredOrders}
        loading={loading}
        onStart={handleStart}
        onHold={handleHoldClick}
        onFulfill={handleFulfillClick}
      />

      {/* Dialogs */}
      <PackingHoldDialog
        open={holdDialogOpen}
        onOpenChange={setHoldDialogOpen}
        onSubmit={handleHoldSubmit}
        orderId={selectedOrderId}
      />

      <PackingFulfillDialog
        open={fulfillDialogOpen}
        onOpenChange={setFulfillDialogOpen}
        onSubmit={handleFulfillSubmit}
        orderId={selectedOrderId}
        packers={config.packers}
        carriers={config.carriers}
      />
    </div>
  );
}
