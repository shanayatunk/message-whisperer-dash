import { useState, useEffect, useCallback } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  Trash2, 
  Save, 
  Loader2,
  MessageCircle,
  ShoppingBag,
  Smartphone
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface GreetingMenuItem {
  id: string;
  title: string;
}

interface ShopifyAction {
  type: "collection" | "tag";
  value: string;
}

interface ShopCategory {
  id: string;
  title: string;
  shopify_action: ShopifyAction;
}

interface BusinessConfig {
  whatsapp_greeting_menu: GreetingMenuItem[];
  whatsapp_shop_categories: ShopCategory[];
  [key: string]: unknown;
}

const generateId = (title: string, prefix: string): string => {
  return `${prefix}_${title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20)}`;
};

const MAX_GREETING_ITEMS = 3;
const MAX_SHOP_CATEGORIES = 10;

export default function WhatsAppMenuConfig() {
  const { businessId } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<BusinessConfig | null>(null);
  
  const [greetingMenu, setGreetingMenu] = useState<GreetingMenuItem[]>([]);
  const [shopCategories, setShopCategories] = useState<ShopCategory[]>([]);
  const [previewTab, setPreviewTab] = useState<"greeting" | "shop">("greeting");

  const fetchConfig = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const response = await apiRequest<{ data: BusinessConfig }>(
        `/api/v1/admin/business-config/${businessId}`
      );
      const data = response.data;
      setConfig(data);
      setGreetingMenu(data?.whatsapp_greeting_menu || []);
      setShopCategories(data?.whatsapp_shop_categories || []);
    } catch (error) {
      console.error("Failed to fetch config:", error);
      toast.error("Failed to load configuration");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const validateConfig = (): boolean => {
    for (const item of greetingMenu) {
      if (!item.title.trim()) {
        toast.error("All greeting menu items must have a title");
        return false;
      }
    }
    for (const cat of shopCategories) {
      if (!cat.title.trim()) {
        toast.error("All shop categories must have a title");
        return false;
      }
      if (!cat.shopify_action.value.trim()) {
        toast.error(`Shop category "${cat.title}" is missing a value`);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateConfig()) return;
    
    setSaving(true);
    try {
      const updatedConfig = {
        ...config,
        whatsapp_greeting_menu: greetingMenu,
        whatsapp_shop_categories: shopCategories,
      };
      
      await apiRequest(`/api/v1/admin/business-config/${businessId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });
      
      setConfig(updatedConfig);
      toast.success("Configuration saved successfully");
    } catch (error) {
      console.error("Failed to save config:", error);
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  // Greeting Menu Handlers
  const addGreetingItem = () => {
    if (greetingMenu.length >= MAX_GREETING_ITEMS) {
      toast.error(`Maximum ${MAX_GREETING_ITEMS} greeting buttons allowed`);
      return;
    }
    const newItem: GreetingMenuItem = {
      id: generateId(`button_${Date.now()}`, "menu"),
      title: "",
    };
    setGreetingMenu([...greetingMenu, newItem]);
  };

  const updateGreetingItem = (index: number, field: keyof GreetingMenuItem, value: string) => {
    const updated = [...greetingMenu];
    updated[index] = { ...updated[index], [field]: value };
    setGreetingMenu(updated);
  };

  const removeGreetingItem = (index: number) => {
    setGreetingMenu(greetingMenu.filter((_, i) => i !== index));
  };

  const moveGreetingItem = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= greetingMenu.length) return;
    const updated = [...greetingMenu];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setGreetingMenu(updated);
  };

  // Shop Categories Handlers
  const addShopCategory = () => {
    if (shopCategories.length >= MAX_SHOP_CATEGORIES) {
      toast.error(`Maximum ${MAX_SHOP_CATEGORIES} shop categories allowed`);
      return;
    }
    const newCategory: ShopCategory = {
      id: generateId(`cat_${Date.now()}`, "cat"),
      title: "",
      shopify_action: { type: "collection", value: "" },
    };
    setShopCategories([...shopCategories, newCategory]);
  };

  const updateShopCategory = (
    index: number,
    field: "title" | "id",
    value: string
  ) => {
    const updated = [...shopCategories];
    updated[index] = { ...updated[index], [field]: value };
    setShopCategories(updated);
  };

  const updateShopifyAction = (
    index: number,
    field: keyof ShopifyAction,
    value: string
  ) => {
    const updated = [...shopCategories];
    updated[index] = {
      ...updated[index],
      shopify_action: { ...updated[index].shopify_action, [field]: value },
    };
    setShopCategories(updated);
  };

  const removeShopCategory = (index: number) => {
    setShopCategories(shopCategories.filter((_, i) => i !== index));
  };

  const moveShopCategory = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= shopCategories.length) return;
    const updated = [...shopCategories];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setShopCategories(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Menu Configuration</h1>
          <p className="text-muted-foreground">
            Configure your WhatsApp greeting buttons and shop categories
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Editors */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Greeting Menu */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <CardTitle>Greeting Menu</CardTitle>
                </div>
                <Badge variant="secondary">
                  {greetingMenu.length}/{MAX_GREETING_ITEMS}
                </Badge>
              </div>
              <CardDescription>
                Configure the welcome message buttons shown to new customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {greetingMenu.map((item, index) => (
                <div
                  key={item.id + index}
                  className="flex items-center gap-2 p-3 rounded-lg border bg-card"
                >
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveGreetingItem(index, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveGreetingItem(index, "down")}
                      disabled={index === greetingMenu.length - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Button Title</Label>
                      <Input
                        value={item.title}
                        onChange={(e) => updateGreetingItem(index, "title", e.target.value)}
                        placeholder="e.g., 📦 Track Order"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">ID (auto-generated)</Label>
                      <Input
                        value={item.id}
                        onChange={(e) => updateGreetingItem(index, "id", e.target.value)}
                        placeholder="menu_track"
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeGreetingItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                variant="outline"
                className="w-full"
                onClick={addGreetingItem}
                disabled={greetingMenu.length >= MAX_GREETING_ITEMS}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Button
              </Button>
            </CardContent>
          </Card>

          {/* Section 2: Shop Categories */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  <CardTitle>Shop Categories</CardTitle>
                </div>
                <Badge variant="secondary">
                  {shopCategories.length}/{MAX_SHOP_CATEGORIES}
                </Badge>
              </div>
              <CardDescription>
                Configure the shopping menu categories linked to Shopify
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {shopCategories.map((cat, index) => (
                <div
                  key={cat.id + index}
                  className="p-4 rounded-lg border bg-card space-y-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col gap-1 pt-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveShopCategory(index, "up")}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveShopCategory(index, "down")}
                        disabled={index === shopCategories.length - 1}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Button Label</Label>
                          <Input
                            value={cat.title}
                            onChange={(e) => updateShopCategory(index, "title", e.target.value)}
                            placeholder="e.g., Ruby Collection"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">ID</Label>
                          <Input
                            value={cat.id}
                            onChange={(e) => updateShopCategory(index, "id", e.target.value)}
                            placeholder="cat_ruby"
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Action Type</Label>
                          <Select
                            value={cat.shopify_action.type}
                            onValueChange={(value) =>
                              updateShopifyAction(index, "type", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="collection">Shopify Collection</SelectItem>
                              <SelectItem value="tag">Product Tag</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            {cat.shopify_action.type === "collection"
                              ? "Collection Handle"
                              : "Tag Name"}
                          </Label>
                          <Input
                            value={cat.shopify_action.value}
                            onChange={(e) =>
                              updateShopifyAction(index, "value", e.target.value)
                            }
                            placeholder={
                              cat.shopify_action.type === "collection"
                                ? "summer-sale"
                                : "ruby"
                            }
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeShopCategory(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                className="w-full"
                onClick={addShopCategory}
                disabled={shopCategories.length >= MAX_SHOP_CATEGORIES}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Phone Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Live Preview</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as "greeting" | "shop")}>
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="greeting" className="flex-1">Greeting</TabsTrigger>
                    <TabsTrigger value="shop" className="flex-1">Shop Menu</TabsTrigger>
                  </TabsList>

                  {/* Phone Mockup */}
                  <div className="relative mx-auto w-full max-w-[280px]">
                    {/* Phone Frame */}
                    <div className="rounded-[2.5rem] border-[8px] border-foreground/20 bg-background shadow-xl overflow-hidden">
                      {/* Status Bar */}
                      <div className="h-6 bg-muted flex items-center justify-center">
                        <div className="w-16 h-1 bg-foreground/20 rounded-full" />
                      </div>

                      {/* WhatsApp Header */}
                      <div className="bg-[#075E54] text-white px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                            <MessageCircle className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">FeelOri Store</p>
                            <p className="text-[10px] opacity-80">online</p>
                          </div>
                        </div>
                      </div>

                      {/* Chat Area */}
                      <div className="h-[320px] bg-[#ECE5DD] p-3 overflow-y-auto">
                        <TabsContent value="greeting" className="mt-0 space-y-2">
                          {/* Bot Message */}
                          <div className="bg-white rounded-lg p-2 max-w-[85%] shadow-sm">
                            <p className="text-xs text-foreground/80">
                              👋 Welcome to FeelOri! How can we help you today?
                            </p>
                          </div>

                          {/* Greeting Buttons Preview */}
                          <div className="space-y-1.5 mt-3">
                            {greetingMenu.length === 0 ? (
                              <div className="text-center py-4 text-xs text-muted-foreground">
                                No buttons configured
                              </div>
                            ) : (
                              greetingMenu.map((item, i) => (
                                <button
                                  key={i}
                                  className="w-full bg-white border border-[#25D366] text-[#25D366] rounded-full py-1.5 px-3 text-xs font-medium hover:bg-[#25D366]/10 transition-colors"
                                >
                                  {item.title || "(Empty)"}
                                </button>
                              ))
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="shop" className="mt-0 space-y-2">
                          {/* Bot Message */}
                          <div className="bg-white rounded-lg p-2 max-w-[85%] shadow-sm">
                            <p className="text-xs text-foreground/80">
                              🛍️ Browse our collections:
                            </p>
                          </div>

                          {/* Shop Categories as List */}
                          <div className="bg-white rounded-lg shadow-sm overflow-hidden mt-2">
                            <div className="bg-[#075E54] text-white px-3 py-1.5">
                              <p className="text-[10px] font-medium">Shop Categories</p>
                            </div>
                            <div className="divide-y divide-border">
                              {shopCategories.length === 0 ? (
                                <div className="text-center py-4 text-xs text-muted-foreground">
                                  No categories configured
                                </div>
                              ) : (
                                shopCategories.map((cat, i) => (
                                  <div
                                    key={i}
                                    className="px-3 py-2 flex items-center justify-between hover:bg-muted/50"
                                  >
                                    <span className="text-xs font-medium text-foreground">
                                      {cat.title || "(Empty)"}
                                    </span>
                                    <Badge variant="outline" className="text-[8px] h-4">
                                      {cat.shopify_action.type}
                                    </Badge>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </TabsContent>
                      </div>

                      {/* Input Bar */}
                      <div className="bg-muted px-2 py-2 flex items-center gap-2">
                        <div className="flex-1 bg-background rounded-full px-3 py-1.5">
                          <p className="text-[10px] text-muted-foreground">Type a message</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center">
                          <MessageCircle className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Tabs>

                <Separator className="my-4" />

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Greeting: Max {MAX_GREETING_ITEMS} buttons</p>
                  <p>• Shop: Max {MAX_SHOP_CATEGORIES} categories</p>
                  <p>• Changes save to your business config</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
