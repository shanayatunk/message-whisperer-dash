import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Search, Package, Clock, PackageOpen, AlertTriangle, CheckCircle, BarChart3, Loader2, Users, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PackingKanbanBoard } from "@/components/packing/PackingKanbanBoard";
import { PackingHoldDialog } from "@/components/packing/PackingHoldDialog";
import { PackingFulfillDialog } from "@/components/packing/PackingFulfillDialog";
import { packingApi, PackingOrder, PackingConfig, PackingMetrics, PackerPerformance } from "@/lib/packingApi";
import { apiRequest } from "@/lib/api";

const BUSINESS_OPTIONS = [
  { id: "feelori", label: "Feelori" },
  { id: "goldencollections", label: "GoldenCollections" },
  { id: "godjewellery9", label: "GodJewellery9" },
];

export default function PackingPage() {
  // State
  const [orders, setOrders] = useState<PackingOrder[]>([]);
  const [config, setConfig] = useState<PackingConfig>({ packers: [], carriers: [] });
  const [metrics, setMetrics] = useState<PackingMetrics>({
    pending: 0,
    in_progress: 0,
    on_hold: 0,
    completed_today: 0,
  });
  const [leaderboard, setLeaderboard] = useState<PackerPerformance[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState("feelori");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Dialog state
  const [holdDialogOpen, setHoldDialogOpen] = useState(false);
  const [fulfillDialogOpen, setFulfillDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [isManageTeamOpen, setIsManageTeamOpen] = useState(false);
  const [newPackerName, setNewPackerName] = useState("");

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

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const data = await packingApi.getMetrics(selectedBusiness);
      setMetrics(data);
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    }
  }, [selectedBusiness]);

  // Fetch leaderboard (only when dialog opens)
  const fetchLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const data = await packingApi.getPerformance(selectedBusiness, 7);
      setLeaderboard(data);
    } catch (error) {
      toast({
        title: "Failed to fetch performance data",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLeaderboardLoading(false);
    }
  }, [selectedBusiness]);

  // Initial fetch & refetch on business change
  useEffect(() => {
    fetchOrders();
    fetchConfig();
    fetchMetrics();
  }, [fetchOrders, fetchConfig, fetchMetrics]);

  // Auto-refresh orders (30s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOrders]);

  // Auto-refresh metrics (60s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMetrics]);

  // Fetch leaderboard when dialog opens
  useEffect(() => {
    if (showLeaderboard) {
      fetchLeaderboard();
    }
  }, [showLeaderboard, fetchLeaderboard]);

  // Actions
  const handleStart = async (orderId: string) => {
    try {
      await packingApi.startOrder(selectedBusiness, orderId);
      toast({ title: "Order started", description: `Order ${orderId} is now in progress.` });
      fetchOrders();
      fetchMetrics();
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
      fetchMetrics();
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
      fetchMetrics();
    } catch (error) {
      toast({
        title: "Failed to fulfill order",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Add packer
  const handleAddPacker = async () => {
    const name = newPackerName.trim();
    if (!name) return;
    try {
      await apiRequest("/api/v1/admin/packers", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      toast({ title: "Packer added", description: `${name} has been added to the team.` });
      setNewPackerName("");
      fetchConfig();
    } catch (error) {
      toast({
        title: "Failed to add packer",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Remove packer
  const handleRemovePacker = async (name: string) => {
    try {
      await apiRequest(`/api/v1/admin/packers/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      toast({ title: "Packer removed", description: `${name} has been removed from the team.` });
      fetchConfig();
    } catch (error) {
      toast({
        title: "Failed to remove packer",
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
      (order.customer_name?.toLowerCase() || "").includes(query)
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

        <div className="flex items-center gap-3">
          {/* Team Stats Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLeaderboard(true)}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Team Stats
          </Button>

          {/* Manage Team Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsManageTeamOpen(true)}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            Manage Team
          </Button>

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
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Queue</p>
                <p className="text-2xl font-bold">{metrics.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{metrics.in_progress}</p>
              </div>
              <PackageOpen className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Hold</p>
                <p className="text-2xl font-bold">{metrics.on_hold}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Shipped Today</p>
                <p className="text-2xl font-bold">{metrics.completed_today}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
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
              onClick={() => { fetchOrders(); fetchMetrics(); }}
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

      {/* Team Stats Dialog */}
      <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Packer Performance (Last 7 Days)</DialogTitle>
          </DialogHeader>
          
          {leaderboardLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No performance data available
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Orders Packed</TableHead>
                  <TableHead className="text-right">Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((packer) => (
                  <TableRow key={packer.name}>
                    <TableCell className="font-medium">{packer.name}</TableCell>
                    <TableCell className="text-right">{packer.count}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {packer.last_active}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Team Dialog */}
      <Dialog open={isManageTeamOpen} onOpenChange={setIsManageTeamOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Packing Team</DialogTitle>
            <DialogDescription>
              Add new packers. New accounts use default password: 'packer123'.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Existing Packers List */}
            <div className="space-y-2">
              {config.packers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No packers configured
                </p>
              ) : (
                config.packers.map((packer) => (
                  <div
                    key={packer}
                    className="flex items-center justify-between p-2 rounded-md border bg-muted/50"
                  >
                    <span className="text-sm font-medium">{packer}</span>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRemovePacker(packer)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Add Packer Row */}
            <div className="flex gap-2">
              <Input
                placeholder="Username"
                value={newPackerName}
                onChange={(e) => setNewPackerName(e.target.value.toLowerCase())}
                onKeyDown={(e) => e.key === "Enter" && handleAddPacker()}
              />
              <Button onClick={handleAddPacker} disabled={!newPackerName.trim()}>
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
