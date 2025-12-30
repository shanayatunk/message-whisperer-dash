import { PackingOrder } from "@/lib/packingApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, CheckCircle, Package } from "lucide-react";

interface PackingOrderCardProps {
  order: PackingOrder;
  borderColor: string;
  onStart: (orderId: string) => void;
  onHold: (orderId: string) => void;
  onFulfill: (orderId: string) => void;
}

export function PackingOrderCard({
  order,
  borderColor,
  onStart,
  onHold,
  onFulfill,
}: PackingOrderCardProps) {
  const renderActions = () => {
    switch (order.status) {
      case "pending":
        return (
          <Button size="sm" variant="outline" onClick={() => onStart(order.order_id)} className="gap-1">
            <Play className="h-3 w-3" />
            Start
          </Button>
        );
      case "in_progress":
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onHold(order.order_id)} className="gap-1">
              <Pause className="h-3 w-3" />
              Hold
            </Button>
            <Button size="sm" onClick={() => onFulfill(order.order_id)} className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Fulfill
            </Button>
          </div>
        );
      case "on_hold":
        return (
          <Button size="sm" variant="outline" onClick={() => onStart(order.order_id)} className="gap-1">
            <Play className="h-3 w-3" />
            Resume
          </Button>
        );
      case "completed":
        return (
          <Badge variant="secondary" className="text-xs">
            Shipped
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className={`border-l-4 ${borderColor} bg-card`}>
      <CardContent className="p-3 space-y-2">
        {/* Order ID & Items */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-sm text-foreground">
              #{order.order_id}
            </p>
            <p className="text-xs text-muted-foreground">
              {order.customer_name}
            </p>
          </div>
          <Badge variant="outline" className="text-xs gap-1">
            <Package className="h-3 w-3" />
            {order.item_count}
          </Badge>
        </div>

        {/* Hold reason if applicable */}
        {order.status === "on_hold" && order.hold_reason && (
          <p className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
            Hold: {order.hold_reason}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end">
          {renderActions()}
        </div>
      </CardContent>
    </Card>
  );
}
