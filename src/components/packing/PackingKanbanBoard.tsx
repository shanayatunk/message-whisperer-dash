import { PackingOrder } from "@/lib/packingApi";
import { PackingOrderCard } from "./PackingOrderCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Play, Pause, CheckCircle } from "lucide-react";

interface PackingKanbanBoardProps {
  orders: PackingOrder[];
  loading: boolean;
  onStart: (orderId: string) => void;
  onHold: (orderId: string) => void;
  onFulfill: (orderId: string) => void;
}

interface KanbanColumn {
  id: PackingOrder["status"];
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  borderColor: string;
  bgColor: string;
}

const COLUMNS: KanbanColumn[] = [
  {
    id: "Pending",
    title: "Pending",
    icon: Clock,
    borderColor: "border-l-warning",
    bgColor: "bg-warning/5",
  },
  {
    id: "In Progress",
    title: "In Progress",
    icon: Play,
    borderColor: "border-l-primary",
    bgColor: "bg-primary/5",
  },
  {
    id: "On Hold",
    title: "On Hold",
    icon: Pause,
    borderColor: "border-l-destructive",
    bgColor: "bg-destructive/5",
  },
  {
    id: "Completed",
    title: "Completed",
    icon: CheckCircle,
    borderColor: "border-l-success",
    bgColor: "bg-success/5",
  },
];

export function PackingKanbanBoard({
  orders,
  loading,
  onStart,
  onHold,
  onFulfill,
}: PackingKanbanBoardProps) {
  const getOrdersByStatus = (status: PackingOrder["status"]) =>
    orders.filter((order) => order.status === status);

  if (loading && orders.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <Card key={col.id} className="min-h-[400px]">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUMNS.map((column) => {
        const columnOrders = getOrdersByStatus(column.id);
        const Icon = column.icon;

        return (
          <Card key={column.id} className={`min-h-[400px] ${column.bgColor}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {column.title}
                <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {columnOrders.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {columnOrders.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No orders
                </p>
              ) : (
                columnOrders.map((order) => (
                  <PackingOrderCard
                    key={order.order_id}
                    order={order}
                    borderColor={column.borderColor}
                    onStart={onStart}
                    onHold={onHold}
                    onFulfill={onFulfill}
                  />
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
