import { useBusiness } from "@/contexts/BusinessContext";
import { Radio } from "lucide-react";

export default function Broadcasts() {
  const { businessId } = useBusiness();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Radio className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Broadcasts</h1>
        <span className="text-xs text-muted-foreground">({businessId})</span>
      </div>
      
      <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
        <p className="text-sm">Broadcast campaigns will load here</p>
        <p className="text-xs mt-1">business_id: {businessId}</p>
      </div>
    </div>
  );
}
