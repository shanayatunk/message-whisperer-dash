import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, AlertTriangle } from "lucide-react";

interface StringPreviewCardProps {
  activeString: { key: string; value: string } | null;
  selectedBusiness: "feelori" | "golden";
  onBusinessChange: (value: "feelori" | "golden") => void;
}

const ALLOWED_PLACEHOLDERS = [
  "business_name",
  "support_email",
  "support_phone",
  "website_url",
  "business_address",
  "order_number",
  "tracking_link",
  "estimated_delivery",
  "google_review_url",
  "shipping_policy_url",
  "city_info",
];

const MOCK_CONTEXT: Record<"feelori" | "golden", Record<string, string>> = {
  feelori: {
    business_name: "FeelOri",
    support_email: "support@feelori.com",
    support_phone: "+1 (555) 123-4567",
    website_url: "https://feelori.com",
    business_address: "123 Fashion Ave, New York, NY 10001",
    order_number: "#ORD-1234",
    tracking_link: "bit.ly/track-fo1234",
    estimated_delivery: "Monday, 12th",
    google_review_url: "g.page/feelori/review",
    shipping_policy_url: "feelori.com/shipping",
    city_info: "New York",
  },
  golden: {
    business_name: "Golden Collections",
    support_email: "hello@goldencollections.com",
    support_phone: "+1 (555) 987-6543",
    website_url: "https://goldencollections.com",
    business_address: "456 Luxury Blvd, Los Angeles, CA 90001",
    order_number: "#ORD-1234",
    tracking_link: "bit.ly/track-gc1234",
    estimated_delivery: "Monday, 12th",
    google_review_url: "g.page/golden/review",
    shipping_policy_url: "goldencollections.com/shipping",
    city_info: "Los Angeles",
  },
};

// Extract all placeholders from text
const extractPlaceholders = (text: string): string[] => {
  const regex = /\{([^}]+)\}/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return matches;
};

// Find unknown placeholders
const findUnknownPlaceholders = (placeholders: string[]): string[] => {
  return placeholders.filter((p) => !ALLOWED_PLACEHOLDERS.includes(p));
};

// Suggest similar placeholder
const suggestPlaceholder = (unknown: string): string | null => {
  const lower = unknown.toLowerCase();
  for (const allowed of ALLOWED_PLACEHOLDERS) {
    if (allowed.includes(lower) || lower.includes(allowed.replace(/_/g, ""))) {
      return allowed;
    }
  }
  // Common typo mappings
  if (lower.includes("delivery") || lower.includes("date")) return "estimated_delivery";
  if (lower.includes("track")) return "tracking_link";
  if (lower.includes("order")) return "order_number";
  if (lower.includes("email")) return "support_email";
  if (lower.includes("phone")) return "support_phone";
  if (lower.includes("address")) return "business_address";
  if (lower.includes("name") || lower.includes("business")) return "business_name";
  if (lower.includes("url") || lower.includes("website") || lower.includes("link")) return "website_url";
  return null;
};

// Replace placeholders with mock values
const renderPreview = (text: string, context: Record<string, string>): string => {
  let result = text;
  for (const [key, value] of Object.entries(context)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
};

export default function StringPreviewCard({
  activeString,
  selectedBusiness,
  onBusinessChange,
}: StringPreviewCardProps) {
  const context = MOCK_CONTEXT[selectedBusiness];

  const { renderedPreview, warnings } = useMemo(() => {
    if (!activeString) {
      return { renderedPreview: "", warnings: [] };
    }

    const placeholders = extractPlaceholders(activeString.value);
    const unknownPlaceholders = findUnknownPlaceholders(placeholders);

    const warningMessages = unknownPlaceholders.map((unknown) => {
      const suggestion = suggestPlaceholder(unknown);
      if (suggestion) {
        return `Unknown variable '{${unknown}}'. Did you mean '{${suggestion}}'?`;
      }
      return `Unknown variable '{${unknown}}'. Allowed: ${ALLOWED_PLACEHOLDERS.join(", ")}`;
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
                      <code className="text-xs">{`{${key}}`}</code>
                      <span className="mx-1">→</span>
                      <span className="text-muted-foreground">{value}</span>
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
