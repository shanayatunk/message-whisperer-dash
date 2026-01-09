import { useState, useEffect, useMemo } from "react";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { 
  Loader2, RotateCcw, Save, Search, Brain, Zap, BookOpen, Database,
  Instagram, Facebook, Youtube, Truck, RotateCw, ArrowRightLeft, MapPin, Clock
} from "lucide-react";
import { toast } from "sonner";
import StringPreviewCard from "@/components/strings/StringPreviewCard";

interface StringItem {
  key: string;
  value: string;
}

interface StringsResponse {
  strings: StringItem[];
}

interface KnowledgeBaseConfig {
  social_media: { instagram: string; facebook: string; youtube: string };
  policies: { shipping: string; returns: string; exchanges: string };
  locations: { store_address: string; operating_hours: string };
}

const PERSONA_KEYS = ["FEELORI_SYSTEM_PROMPT", "GOLDEN_SYSTEM_PROMPT"];
const QUICK_RESPONSE_PREFIXES = ["ERROR_", "HUMAN_", "NO_ORDERS_", "ORDER_NUMBER_", "WELCOME_"];

const DEFAULT_KNOWLEDGE_BASE: KnowledgeBaseConfig = {
  social_media: { instagram: "", facebook: "", youtube: "" },
  policies: { shipping: "", returns: "", exchanges: "" },
  locations: { store_address: "", operating_hours: "" },
};

// Convert SNAKE_CASE key to human-readable label
const formatKeyToLabel = (key: string): string => {
  return key
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// Group strings by their prefix for accordion display
const groupStringsByPrefix = (items: StringItem[]): Record<string, StringItem[]> => {
  const groups: Record<string, StringItem[]> = {};
  
  items.forEach((item) => {
    const prefix = item.key.split("_")[0] || "Other";
    if (!groups[prefix]) {
      groups[prefix] = [];
    }
    groups[prefix].push(item);
  });
  
  return groups;
};

export default function AIStringsManager() {
  const [strings, setStrings] = useState<StringItem[]>([]);
  const [originalStrings, setOriginalStrings] = useState<StringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStringKey, setActiveStringKey] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<"feelori" | "golden">("feelori");
  
  // Knowledge Base state
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseConfig | null>(null);
  const [originalKnowledgeBase, setOriginalKnowledgeBase] = useState<KnowledgeBaseConfig | null>(null);
  const [savingKB, setSavingKB] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedBusiness]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch strings
      const stringsResponse = await apiRequest<{ data: { strings: StringItem[] } }>("/api/v1/admin/strings");
      setStrings(stringsResponse.data?.strings || []);
      setOriginalStrings(stringsResponse.data?.strings || []);
      
      // Fetch knowledge base
      try {
        const kbResponse = await apiRequest<{ data: KnowledgeBaseConfig }>(`/api/settings/knowledge-base/${selectedBusiness}`);
        const kbData = kbResponse.data || DEFAULT_KNOWLEDGE_BASE;
        setKnowledgeBase(kbData);
        setOriginalKnowledgeBase(kbData);
      } catch {
        // If knowledge base doesn't exist yet, use defaults
        setKnowledgeBase({ ...DEFAULT_KNOWLEDGE_BASE });
        setOriginalKnowledgeBase({ ...DEFAULT_KNOWLEDGE_BASE });
      }
    } catch (error) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKnowledgeBase = async () => {
    if (!knowledgeBase) return;
    
    setSavingKB(true);
    try {
      await apiRequest(`/api/settings/knowledge-base/${selectedBusiness}`, {
        method: "PATCH",
        body: JSON.stringify(knowledgeBase),
      });
      setOriginalKnowledgeBase({ ...knowledgeBase });
      toast.success("Knowledge Base saved successfully");
    } catch (error) {
      toast.error("Failed to save Knowledge Base");
      console.error(error);
    } finally {
      setSavingKB(false);
    }
  };

  const updateKnowledgeBase = <K extends keyof KnowledgeBaseConfig>(
    section: K,
    field: keyof KnowledgeBaseConfig[K],
    value: string
  ) => {
    if (!knowledgeBase) return;
    setKnowledgeBase({
      ...knowledgeBase,
      [section]: {
        ...knowledgeBase[section],
        [field]: value,
      },
    });
  };

  const hasKBChanges = useMemo(() => {
    return JSON.stringify(knowledgeBase) !== JSON.stringify(originalKnowledgeBase);
  }, [knowledgeBase, originalKnowledgeBase]);

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

  // Get active string object
  const activeString = useMemo(() => {
    if (!activeStringKey) return null;
    return strings.find((s) => s.key === activeStringKey) || null;
  }, [activeStringKey, strings]);

  // Categorize strings
  const personaStrings = useMemo(
    () => strings.filter((s) => PERSONA_KEYS.includes(s.key)),
    [strings]
  );

  const quickResponseStrings = useMemo(
    () =>
      strings.filter(
        (s) =>
          !PERSONA_KEYS.includes(s.key) &&
          QUICK_RESPONSE_PREFIXES.some((prefix) => s.key.startsWith(prefix))
      ),
    [strings]
  );

  const informationalStrings = useMemo(
    () =>
      strings.filter(
        (s) =>
          !PERSONA_KEYS.includes(s.key) &&
          !QUICK_RESPONSE_PREFIXES.some((prefix) => s.key.startsWith(prefix))
      ),
    [strings]
  );

  // Filter informational strings by search query
  const filteredInformationalStrings = useMemo(() => {
    if (!searchQuery.trim()) return informationalStrings;
    const query = searchQuery.toLowerCase();
    return informationalStrings.filter(
      (s) =>
        s.key.toLowerCase().includes(query) ||
        s.value.toLowerCase().includes(query)
    );
  }, [informationalStrings, searchQuery]);

  const groupedInformationalStrings = useMemo(
    () => groupStringsByPrefix(filteredInformationalStrings),
    [filteredInformationalStrings]
  );

  const hasChanges = useMemo(() => {
    return JSON.stringify(strings) !== JSON.stringify(originalStrings);
  }, [strings, originalStrings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Reusable editable card with focus tracking
  const EditableStringCard = ({ item }: { item: StringItem }) => (
    <Card key={item.key}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {formatKeyToLabel(item.key)}
        </CardTitle>
        <Badge variant="outline" className="w-fit font-mono text-xs text-muted-foreground">
          {item.key}
        </Badge>
      </CardHeader>
      <CardContent>
        <Textarea
          value={item.value}
          onChange={(e) => handleValueChange(item.key, e.target.value)}
          onFocus={() => setActiveStringKey(item.key)}
          className="min-h-[100px] text-sm resize-y"
        />
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b pb-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI & Strings Manager</h1>
            <p className="text-sm text-muted-foreground">
              Manage AI Personas and automated responses
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleReset}
              disabled={saving || !hasChanges}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="templates" className="flex-1">
        <TabsList className="mb-4">
          <TabsTrigger value="templates" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Response Templates
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-2">
            <Database className="h-4 w-4" />
            Knowledge & Facts
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Response Templates */}
        <TabsContent value="templates" className="space-y-6">
          <Tabs defaultValue="personas">
            <TabsList className="mb-4">
              <TabsTrigger value="personas" className="gap-2">
                <Brain className="h-4 w-4" />
                AI Personas
              </TabsTrigger>
              <TabsTrigger value="quick" className="gap-2">
                <Zap className="h-4 w-4" />
                Quick Responses
              </TabsTrigger>
              <TabsTrigger value="informational" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Informational
              </TabsTrigger>
            </TabsList>

        {/* Tab 1: AI Personas */}
        <TabsContent value="personas" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">FeelOri Persona</CardTitle>
                <Badge variant="secondary" className="w-fit font-mono text-xs">
                  FEELORI_SYSTEM_PROMPT
                </Badge>
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
                <Badge variant="secondary" className="w-fit font-mono text-xs">
                  GOLDEN_SYSTEM_PROMPT
                </Badge>
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
        </TabsContent>

        {/* Tab 2: Quick Responses - Split View */}
        <TabsContent value="quick" className="space-y-4">
          {quickResponseStrings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No quick response strings found.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Left Panel - Editors (60%) */}
              <div className="lg:col-span-3 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickResponseStrings.map((item) => (
                    <EditableStringCard key={item.key} item={item} />
                  ))}
                </div>
              </div>
              
              {/* Right Panel - Preview (40%) */}
              <div className="lg:col-span-2">
                <StringPreviewCard
                  activeString={activeString}
                  selectedBusiness={selectedBusiness}
                  onBusinessChange={setSelectedBusiness}
                />
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Informational Templates - Split View */}
        <TabsContent value="informational" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Left Panel - Editors (60%) */}
            <div className="lg:col-span-3 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {filteredInformationalStrings.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    {searchQuery
                      ? "No templates match your search."
                      : "No informational templates found."}
                  </CardContent>
                </Card>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {Object.entries(groupedInformationalStrings).map(([prefix, items]) => (
                    <AccordionItem key={prefix} value={prefix} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatKeyToLabel(prefix)}</span>
                          <Badge variant="secondary" className="text-xs">
                            {items.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {items.map((item) => (
                            <div key={item.key} className="space-y-2">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium">
                                  {formatKeyToLabel(item.key)}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="w-fit font-mono text-xs text-muted-foreground"
                                >
                                  {item.key}
                                </Badge>
                              </div>
                              <Textarea
                                value={item.value}
                                onChange={(e) => handleValueChange(item.key, e.target.value)}
                                onFocus={() => setActiveStringKey(item.key)}
                                className="min-h-[100px] text-sm resize-y"
                              />
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>

            {/* Right Panel - Preview (40%) */}
            <div className="lg:col-span-2">
              <StringPreviewCard
                activeString={activeString}
                selectedBusiness={selectedBusiness}
                onBusinessChange={setSelectedBusiness}
              />
            </div>
          </div>
        </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Tab 2: Knowledge & Facts */}
        <TabsContent value="knowledge" className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Configure business knowledge for AI assistants
            </p>
            <Button 
              onClick={handleSaveKnowledgeBase} 
              disabled={savingKB || !hasKBChanges}
            >
              {savingKB ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Knowledge Base
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Social Media Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Social Media</CardTitle>
                <CardDescription>Links to your social media profiles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-500" />
                    Instagram
                  </Label>
                  <Input
                    placeholder="https://instagram.com/yourbrand"
                    value={knowledgeBase?.social_media.instagram || ""}
                    onChange={(e) => updateKnowledgeBase("social_media", "instagram", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-blue-600" />
                    Facebook
                  </Label>
                  <Input
                    placeholder="https://facebook.com/yourbrand"
                    value={knowledgeBase?.social_media.facebook || ""}
                    onChange={(e) => updateKnowledgeBase("social_media", "facebook", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-red-500" />
                    YouTube
                  </Label>
                  <Input
                    placeholder="https://youtube.com/@yourbrand"
                    value={knowledgeBase?.social_media.youtube || ""}
                    onChange={(e) => updateKnowledgeBase("social_media", "youtube", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Location Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Location</CardTitle>
                <CardDescription>Store address and operating hours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Store Address
                  </Label>
                  <Textarea
                    placeholder="123 Main St, City, State, ZIP"
                    value={knowledgeBase?.locations.store_address || ""}
                    onChange={(e) => updateKnowledgeBase("locations", "store_address", e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Operating Hours
                  </Label>
                  <Textarea
                    placeholder="Mon-Fri: 9am-6pm, Sat: 10am-4pm"
                    value={knowledgeBase?.locations.operating_hours || ""}
                    onChange={(e) => updateKnowledgeBase("locations", "operating_hours", e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Policies Card - Full Width */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Store Policies</CardTitle>
                <CardDescription>Shipping, returns, and exchange policies for AI to reference</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      Shipping Policy
                    </Label>
                    <Textarea
                      placeholder="Enter shipping policy details..."
                      value={knowledgeBase?.policies.shipping || ""}
                      onChange={(e) => updateKnowledgeBase("policies", "shipping", e.target.value)}
                      className="min-h-[150px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <RotateCw className="h-4 w-4 text-muted-foreground" />
                      Return Policy
                    </Label>
                    <Textarea
                      placeholder="Enter return policy details..."
                      value={knowledgeBase?.policies.returns || ""}
                      onChange={(e) => updateKnowledgeBase("policies", "returns", e.target.value)}
                      className="min-h-[150px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                      Exchange Policy
                    </Label>
                    <Textarea
                      placeholder="Enter exchange policy details..."
                      value={knowledgeBase?.policies.exchanges || ""}
                      onChange={(e) => updateKnowledgeBase("policies", "exchanges", e.target.value)}
                      className="min-h-[150px]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
