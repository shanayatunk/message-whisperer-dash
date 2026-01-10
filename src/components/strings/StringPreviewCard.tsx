import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, AlertTriangle } from "lucide-react";

interface StringPreviewCardProps {
  activeString: { key: string; value: string } | null;
  selectedBusiness: string;
  onBusinessChange: (value: string) => void;
}

// Backend variable names (without braces)
const ALLOWED_PLACEHOLDERS = [
  "Store_Name",
  "Store_Address",
  "Support_Phone",
  "Wholesale_Phone",
  "Support_Email",
  "Store_Hours",
  "Website_URL",
  "Shipping_Policy_URL",
  "Google_Review_Link",
  "Social_Media_Links",
  "order_number",
  "tracking_link",
  "estimated_delivery",
  "city_info",
];

// Mock context uses {{Variable}} format as keys
const MOCK_CONTEXT: Record<"feelori" | "golden", Record<string, string>> = {
  feelori: {
    "{{Store_Name}}": "FeelOri",
    "{{Store_Address}}": "123 Fashion Ave, New York, NY 10001",
    "{{Support_Phone}}": "+1 (555) 123-4567",
    "{{Wholesale_Phone}}": "+1 (555) 123-4568",
    "{{Support_Email}}": "support@feelori.com",
    "{{Store_Hours}}": "Mon-Fri 9AM-6PM EST",
    "{{Website_URL}}": "https://feelori.com",
    "{{Shipping_Policy_URL}}": "feelori.com/shipping",
    "{{Google_Review_Link}}": "g.page/feelori/review",
    "{{Social_Media_Links}}": "@feelori",
    "{{order_number}}": "#ORD-1234",
    "{{tracking_link}}": "bit.ly/track-fo1234",
    "{{estimated_delivery}}": "Monday, 12th",
    "{{city_info}}": "New York",
  },
  golden: {
    "{{Store_Name}}": "Golden Collections",
    "{{Store_Address}}": "456 Luxury Blvd, Los Angeles, CA 90001",
    "{{Support_Phone}}": "+1 (555) 987-6543",
    "{{Wholesale_Phone}}": "+1 (555) 987-6544",
    "{{Support_Email}}": "hello@goldencollections.com",
    "{{Store_Hours}}": "Mon-Sat 10AM-8PM PST",
    "{{Website_URL}}": "https://goldencollections.com",
    "{{Shipping_Policy_URL}}": "goldencollections.com/shipping",
    "{{Google_Review_Link}}": "g.page/golden/review",
    "{{Social_Media_Links}}": "@goldencollections",
    "{{order_number}}": "#ORD-5678",
    "{{tracking_link}}": "bit.ly/track-gc1234",
    "{{estimated_delivery}}": "Tuesday, 13th",
    "{{city_info}}": "Los Angeles",
  },
};

// Extract all placeholders from text (double curly braces)
const extractPlaceholders = (text: string): string[] => {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return matches;
};

// Find unknown placeholders (case-insensitive comparison)
const findUnknownPlaceholders = (placeholders: string[]): string[] => {
  return placeholders.filter((p) => {
    const lowerP = p.toLowerCase();
    return !ALLOWED_PLACEHOLDERS.some(allowed => allowed.toLowerCase() === lowerP);
  });
};

// Suggest similar placeholder (case-insensitive)
const suggestPlaceholder = (unknown: string): string | null => {
  const lower = unknown.toLowerCase();
  
  // Direct case-insensitive match
  for (const allowed of ALLOWED_PLACEHOLDERS) {
    if (allowed.toLowerCase() === lower) {
      return allowed;
    }
  }
  
  // Partial match
  for (const allowed of ALLOWED_PLACEHOLDERS) {
    const allowedLower = allowed.toLowerCase().replace(/_/g, "");
    if (allowedLower.includes(lower) || lower.includes(allowedLower)) {
      return allowed;
    }
  }
  
  // Common typo mappings
  if (lower.includes("delivery") || lower.includes("date")) return "estimated_delivery";
  if (lower.includes("track")) return "tracking_link";
  if (lower.includes("order")) return "order_number";
  if (lower.includes("email")) return "Support_Email";
  if (lower.includes("phone")) return "Support_Phone";
  if (lower.includes("address")) return "Store_Address";
  if (lower.includes("name") || lower.includes("store") || lower.includes("business")) return "Store_Name";
  if (lower.includes("url") || lower.includes("website")) return "Website_URL";
  if (lower.includes("hour")) return "Store_Hours";
  if (lower.includes("review") || lower.includes("google")) return "Google_Review_Link";
  if (lower.includes("social") || lower.includes("media")) return "Social_Media_Links";
  if (lower.includes("shipping") || lower.includes("policy")) return "Shipping_Policy_URL";
  if (lower.includes("wholesale")) return "Wholesale_Phone";
  return null;
};

// Replace {{placeholders}} with mock values
const renderPreview = (text: string, context: Record<string, string>): string => {
  let result = text;
  for (const [key, value] of Object.entries(context)) {
    // key is already in {{Variable}} format
    result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
  }
  return result;
};

export default function StringPreviewCard({
  activeString,
  selectedBusiness,
  onBusinessChange,
}: StringPreviewCardProps) {
  const context = MOCK_CONTEXT[selectedBusiness as keyof typeof MOCK_CONTEXT] || MOCK_CONTEXT.feelori;

  const { renderedPreview, warnings } = useMemo(() => {
    if (!activeString) {
      return { renderedPreview: "", warnings: [] };
    }

    const placeholders = extractPlaceholders(activeString.value);
    const unknownPlaceholders = findUnknownPlaceholders(placeholders);

    const warningMessages = unknownPlaceholders.map((unknown) => {
      const suggestion = suggestPlaceholder(unknown);
      if (suggestion) {
        return `Unknown variable '{{${unknown}}}'. Did you mean '{{${suggestion}}}'?`;
      }
      return `Unknown variable '{{${unknown}}}'. Allowed: ${ALLOWED_PLACEHOLDERS.map(p => `{{${p}}}`).join(", ")}`;
    });

    return {
      renderedPreview: renderPreview(activeString.value, context),
      warnings: warningMessages,
    };
  }, [activeString, context]);

  const formatKeyToLabel = (key: string): string => {
    return key
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <Card className="sticky top-24 h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Message Preview
          </CardTitle>
          <ToggleGroup
            type="single"
            value={selectedBusiness}
            onValueChange={(val) => val && onBusinessChange(val as "feelori" | "golden")}
            className="h-8"
          >
            <ToggleGroupItem value="feelori" className="text-xs px-3 h-7">
              FeelOri
            </ToggleGroupItem>
            <ToggleGroupItem value="golden" className="text-xs px-3 h-7">
              Golden
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!activeString ? (
          <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-md">
            Click on a text field to preview it here
          </div>
        ) : (
          <>
            <div className="text-xs text-muted-foreground">
              Previewing: <span className="font-medium">{formatKeyToLabel(activeString.key)}</span>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="space-y-2">
                {warnings.map((warning, idx) => (
                  <Alert key={idx} variant="default" className="border-yellow-500/50 bg-yellow-500/10">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-xs text-yellow-700 dark:text-yellow-400">
                      {warning}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Preview */}
            <div className="bg-muted/50 rounded-md p-4 text-sm whitespace-pre-wrap border">
              {renderedPreview || (
                <span className="text-muted-foreground italic">Empty message</span>
              )}
            </div>

            {/* Mock data info */}
            <div className="text-xs text-muted-foreground">
              <details>
                <summary className="cursor-pointer hover:text-foreground">
                  View mock data for {selectedBusiness === "feelori" ? "FeelOri" : "Golden Collections"}
                </summary>
                <div className="mt-2 space-y-1 pl-2 border-l-2 border-muted">
                  {Object.entries(context).map(([key, value]) => (
                    <div key={key}>
                      <code className="text-xs">{key}</code>
                      <span className="mx-1">→</span>
                      <span className="text-muted-foreground">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
