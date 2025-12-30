import { PackingOrder } from "@/lib/packingApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, CheckCircle, Package, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  // Safety check: disable actions if order_id is missing or empty
  const isValid = !!order.order_id && order.order_id !== "";

  const renderActionButton = (
    onClick: () => void,
    icon: React.ReactNode,
    label: string,
    variant: "default" | "outline" = "outline"
  ) => {
    const button = (
      <Button 
        size="sm" 
        variant={variant}
        onClick={onClick} 
        className="gap-1"
        disabled={!isValid}
      >
        {icon}
        {label}
      </Button>
    );

    if (!isValid) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{button}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Order ID missing</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return button;
  };

  const renderActions = () => {
    switch (order.status) {
      case "Pending":
        return renderActionButton(
          () => onStart(order.order_id),
          <Play className="h-3 w-3" />,
          "Start"
        );
      case "In Progress":
        return (
          <div className="flex gap-2">
            {renderActionButton(
              () => onHold(order.order_id),
              <Pause className="h-3 w-3" />,
              "Hold"
            )}
            {renderActionButton(
              () => onFulfill(order.order_id),
              <CheckCircle className="h-3 w-3" />,
              "Fulfill",
              "default"
            )}
          </div>
        );
      case "On Hold":
        return renderActionButton(
          () => onStart(order.order_id),
          <Play className="h-3 w-3" />,
          "Resume"
        );
      case "Completed":
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
              {order.order_number || "N/A"}
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
        {order.status === "On Hold" && order.hold_reason && (
          <p className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
            Hold: {order.hold_reason}
          </p>
        )}

        {/* Invalid ID warning with debug data */}
        {!isValid && (
          <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive overflow-auto">
            <p className="font-bold flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Invalid Order Data:
            </p>
            <pre className="mt-1 whitespace-pre-wrap break-all">{JSON.stringify(order, null, 2)}</pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end">
          {renderActions()}
        </div>
      </CardContent>
    </Card>
  );
}
