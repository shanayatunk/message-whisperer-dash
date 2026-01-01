import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

interface StringItem {
  key: string;
  value: string;
}

interface StringsResponse {
  strings: StringItem[];
}

const PERSONA_KEYS = ["FEELORI_SYSTEM_PROMPT", "GOLDEN_SYSTEM_PROMPT"];

export default function AIStringsManager() {
  const [strings, setStrings] = useState<StringItem[]>([]);
  const [originalStrings, setOriginalStrings] = useState<StringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStrings();
  }, []);

  const fetchStrings = async () => {
    setLoading(true);
    try {
      const response = await apiRequest<{ data: { strings: StringItem[] } }>("/api/v1/admin/strings");
      setStrings(response.data?.strings || []);
      setOriginalStrings(response.data?.strings || []);
    } catch (error) {
      toast.error("Failed to load strings");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (key: string, newValue: string) => {
    setStrings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value: newValue } : s))
    );
  };

  const handleReset = () => {
    setStrings([...originalStrings]);
    toast.info("Changes reset to last saved state");
  };

  const handleSave = async () => {
    if (!window.confirm("Are you sure you want to save these changes?")) {
      return;
    }

    setSaving(true);
    try {
      await apiRequest("/api/v1/admin/strings", {
        method: "PUT",
        body: JSON.stringify({ strings }),
      });
      setOriginalStrings([...strings]);
      toast.success("Strings saved successfully");
    } catch (error) {
      toast.error("Failed to save strings");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const getStringValue = (key: string): string => {
    return strings.find((s) => s.key === key)?.value || "";
  };

  const personaStrings = strings.filter((s) => PERSONA_KEYS.includes(s.key));
  const generalStrings = strings.filter((s) => !PERSONA_KEYS.includes(s.key));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI & Strings Manager</h1>
          <p className="text-sm text-muted-foreground">
            Manage AI Personas and automated responses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleReset} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* AI Personas Section */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">AI Personas</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">FeelOri Persona</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={getStringValue("FEELORI_SYSTEM_PROMPT")}
                onChange={(e) =>
                  handleValueChange("FEELORI_SYSTEM_PROMPT", e.target.value)
                }
                className="min-h-[300px] font-mono text-sm resize-y"
                placeholder="Enter the FeelOri system prompt..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Golden Collections Persona</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={getStringValue("GOLDEN_SYSTEM_PROMPT")}
                onChange={(e) =>
                  handleValueChange("GOLDEN_SYSTEM_PROMPT", e.target.value)
                }
                className="min-h-[300px] font-mono text-sm resize-y"
                placeholder="Enter the Golden Collections system prompt..."
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* General Strings Section */}
      {generalStrings.length > 0 && (
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">General Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {generalStrings.map((item) => (
                  <div key={item.key} className="space-y-2">
                    <Label className="text-xs font-mono text-muted-foreground">
                      {item.key}
                    </Label>
                    {item.value.length > 100 ? (
                      <Textarea
                        value={item.value}
                        onChange={(e) => handleValueChange(item.key, e.target.value)}
                        className="min-h-[100px] text-sm resize-y"
                      />
                    ) : (
                      <Input
                        value={item.value}
                        onChange={(e) => handleValueChange(item.key, e.target.value)}
                        className="text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
