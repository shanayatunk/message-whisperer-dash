import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PackingFulfillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (packer: string, carrier: string, trackingNumber: string) => void;
  orderId: string | null;
  packers: string[];
  carriers: string[];
}

export function PackingFulfillDialog({
  open,
  onOpenChange,
  onSubmit,
  orderId,
  packers,
  carriers,
}: PackingFulfillDialogProps) {
  const [packer, setPacker] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!packer || !carrier || !trackingNumber) return;
    setSubmitting(true);
    await onSubmit(packer, carrier, trackingNumber);
    setSubmitting(false);
    setPacker("");
    setCarrier("");
    setTrackingNumber("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPacker("");
      setCarrier("");
      setTrackingNumber("");
    }
    onOpenChange(newOpen);
  };

  // Fallback options if config is empty
  const packerOptions = packers.length > 0 ? packers : ["Packer 1", "Packer 2", "Packer 3"];
  const carrierOptions = carriers.length > 0 ? carriers : ["BlueDart", "Delhivery", "DTDC", "FedEx"];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fulfill Order</DialogTitle>
          <DialogDescription>
            Complete order #{orderId} and add shipping details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="packer">Packer *</Label>
            <Select value={packer} onValueChange={setPacker}>
              <SelectTrigger>
                <SelectValue placeholder="Select packer" />
              </SelectTrigger>
              <SelectContent>
                {packerOptions.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="carrier">Carrier *</Label>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger>
                <SelectValue placeholder="Select carrier" />
              </SelectTrigger>
              <SelectContent>
                {carrierOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tracking">Tracking Number *</Label>
            <Input
              id="tracking"
              placeholder="Enter tracking number..."
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!packer || !carrier || !trackingNumber || submitting}
          >
            {submitting ? "Processing..." : "Mark as Fulfilled"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
