import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createBroadcastGroup } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Users, Loader2 } from "lucide-react";

interface AudienceDialogProps {
  onGroupCreated: () => void;
}

export function AudienceDialog({ onGroupCreated }: AudienceDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phoneNumbers, setPhoneNumbers] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const parsePhoneNumbers = (input: string): string[] => {
    // Split by newlines and commas, trim whitespace, filter empty strings
    return input
      .split(/[\n,]+/)
      .map((phone) => phone.trim().replace(/\D/g, "")) // Remove non-digits
      .filter((phone) => phone.length >= 10);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a group name",
      });
      return;
    }

    const phones = parsePhoneNumbers(phoneNumbers);
    if (phones.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter at least one valid phone number (min 10 digits)",
      });
      return;
    }

    setIsCreating(true);
    try {
      await createBroadcastGroup(name.trim(), phones);
      toast({
        title: "Success",
        description: `Group "${name}" created with ${phones.length} numbers`,
      });
      setOpen(false);
      setName("");
      setPhoneNumbers("");
      onGroupCreated();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create group",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const parsedCount = parsePhoneNumbers(phoneNumbers).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="mr-2 h-4 w-4" />
          New Audience
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Audience Group</DialogTitle>
          <DialogDescription>
            Create a custom group of phone numbers for targeted broadcasts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="e.g., VIP Customers"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone-numbers">
              Phone Numbers
              {parsedCount > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({parsedCount} valid)
                </span>
              )}
            </Label>
            <Textarea
              id="phone-numbers"
              placeholder="Enter phone numbers separated by commas or new lines&#10;e.g., +1234567890, +0987654321"
              value={phoneNumbers}
              onChange={(e) => setPhoneNumbers(e.target.value)}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Numbers with at least 10 digits will be included.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Group"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
