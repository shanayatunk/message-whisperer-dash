import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

export function BusinessSelector() {
  const { user, switchBusiness } = useAuth();
  const businessId = user?.tenant_id || "feelori";
  const [isLoading, setIsLoading] = useState(false);

  const handleSwitch = async (newVal: string) => {
    // Guardrail: prevent unnecessary reloads
    if (newVal === businessId) return;

    setIsLoading(true);
    try {
      await switchBusiness(newVal);
      // Note: page will reload after switchBusiness, so no need to setIsLoading(false)
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <Select value={businessId} onValueChange={handleSwitch} disabled={isLoading}>
      <SelectTrigger className="h-8 text-xs border-border w-[180px]">
        <SelectValue placeholder={isLoading ? "Switching..." : "Select business"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">All Businesses</SelectItem>
        <SelectItem value="feelori">Feelori</SelectItem>
        <SelectItem value="goldencollections">Golden Collections</SelectItem>
      </SelectContent>
    </Select>
  );
}
