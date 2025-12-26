import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBusiness } from "@/contexts/BusinessContext";

export function BusinessSelector() {
  const { businessId, setBusinessId } = useBusiness();

  return (
    <Select value={businessId} onValueChange={setBusinessId}>
      <SelectTrigger className="h-8 text-xs border-border">
        <SelectValue placeholder="Select business" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="feelori">Feelori</SelectItem>
        <SelectItem value="business_b">Business B</SelectItem>
        <SelectItem value="business_c">Business C</SelectItem>
      </SelectContent>
    </Select>
  );
}
