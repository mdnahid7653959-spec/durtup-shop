import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/firebaseAdapter";
import { Loader2, Save, RefreshCw, Globe, Settings, Percent, DollarSign } from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

interface CJSettings {
  id: string;
  is_enabled: boolean;
  default_margin_type: 'percentage' | 'fixed';
  default_margin_value: number;
  usd_to_bdt_rate: number;
  show_in_search: boolean;
  show_in_categories: boolean;
  show_on_homepage: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CJCategoryMapping {
  id: string;
  cj_category_name: string;
  local_category_id: string | null;
  is_enabled: boolean;
  custom_margin_type: 'percentage' | 'fixed' | null;
  custom_margin_value: number | null;
}

export default function AdminCJSettings() {
  const { toast } = useToast();
  const { admin } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CJSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mappings, setMappings] = useState<CJCategoryMapping[]>([]);

  // Common CJ categories for mapping
  const commonCJCategories = [
    "Electronics",
    "Fashion",
    "Beauty & Health",
    "Home & Garden",
    "Sports & Outdoors",
    "Toys & Games",
    "Jewelry & Accessories",
    "Automotive",
    "Baby & Kids",
    "Tools & Hardware",
  ];

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch settings
      const { data: settingsData } = await supabase
        .from("cj_settings")
        .select("*")
        .single();

      if (settingsData) {
        setSettings(settingsData as CJSettings);
      }

      // Fetch local categories
      const { data: catData } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("name");

      setCategories(catData || []);

      // Fetch existing mappings
      const { data: mappingData } = await supabase
        .from("cj_category_mappings")
        .select("*");

      if (mappingData) {
        setMappings(mappingData as CJCategoryMapping[]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  }

  async function handleSaveSettings() {
    if (!settings || !admin) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("cj_settings")
        .update({
          is_enabled: settings.is_enabled,
          default_margin_type: settings.default_margin_type,
          default_margin_value: settings.default_margin_value,
          usd_to_bdt_rate: settings.usd_to_bdt_rate,
          show_in_search: settings.show_in_search,
          show_in_categories: settings.show_in_categories,
          show_on_homepage: settings.show_on_homepage,
        })
        .eq("id", settings.id);

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "CJ Dropshipping settings have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    }
    setSaving(false);
  }

  async function handleMappingChange(cjCategory: string, localCategoryId: string | null) {
    try {
      const existingMapping = mappings.find(m => m.cj_category_name === cjCategory);

      if (existingMapping) {
        // Update existing
        const { error } = await supabase
          .from("cj_category_mappings")
          .update({ local_category_id: localCategoryId || null })
          .eq("id", existingMapping.id);

        if (error) throw error;

        setMappings(prev => 
          prev.map(m => 
            m.id === existingMapping.id 
              ? { ...m, local_category_id: localCategoryId }
              : m
          )
        );
      } else {
        // Create new mapping
        const { data, error } = await supabase
          .from("cj_category_mappings")
          .insert({
            cj_category_name: cjCategory,
            local_category_id: localCategoryId || null,
            is_enabled: true,
          })
          .select()
          .single();

        if (error) throw error;

        setMappings(prev => [...prev, data as CJCategoryMapping]);
      }

      toast({
        title: "Mapping updated",
        description: `${cjCategory} category mapping saved.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update mapping",
        variant: "destructive",
      });
    }
  }

  async function toggleMappingEnabled(cjCategory: string, enabled: boolean) {
    const mapping = mappings.find(m => m.cj_category_name === cjCategory);
    
    if (mapping) {
      const { error } = await supabase
        .from("cj_category_mappings")
        .update({ is_enabled: enabled })
        .eq("id", mapping.id);

      if (!error) {
        setMappings(prev =>
          prev.map(m =>
            m.id === mapping.id ? { ...m, is_enabled: enabled } : m
          )
        );
      }
    } else {
      // Create new mapping with enabled state
      const { data, error } = await supabase
        .from("cj_category_mappings")
        .insert({
          cj_category_name: cjCategory,
          is_enabled: enabled,
        })
        .select()
        .single();

      if (!error && data) {
        setMappings(prev => [...prev, data as CJCategoryMapping]);
      }
    }
  }

  if (loading) {
    return (
      <AdminLayout title="CJ Dropshipping Settings">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="CJ Dropshipping Settings">
      <div className="space-y-6">
        {/* Global Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Global Settings
            </CardTitle>
            <CardDescription>
              Control how CJ products appear on your website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Master Enable Switch */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Enable CJ Products</Label>
                <p className="text-sm text-muted-foreground">
                  Show CJ Dropshipping products on your website
                </p>
              </div>
              <Switch
                checked={settings?.is_enabled || false}
                onCheckedChange={(checked) =>
                  setSettings(prev => prev ? { ...prev, is_enabled: checked } : prev)
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Show on Homepage */}
              <div className="flex items-center justify-between p-4 border rounded-lg border-primary/30 bg-primary/5">
                <div className="space-y-0.5">
                  <Label className="font-medium">Show on Homepage</Label>
                  <p className="text-xs text-muted-foreground">
                    Display CJ Trending section
                  </p>
                </div>
                <Switch
                  checked={settings?.show_on_homepage || false}
                  onCheckedChange={(checked) =>
                    setSettings(prev => prev ? { ...prev, show_on_homepage: checked } : prev)
                  }
                />
              </div>

              {/* Show in Search */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>Show in Search Results</Label>
                  <p className="text-xs text-muted-foreground">
                    Include CJ products in search
                  </p>
                </div>
                <Switch
                  checked={settings?.show_in_search || false}
                  onCheckedChange={(checked) =>
                    setSettings(prev => prev ? { ...prev, show_in_search: checked } : prev)
                  }
                />
              </div>

              {/* Show in Categories */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>Show in Categories</Label>
                  <p className="text-xs text-muted-foreground">
                    Show CJ products in category pages
                  </p>
                </div>
                <Switch
                  checked={settings?.show_in_categories || false}
                  onCheckedChange={(checked) =>
                    setSettings(prev => prev ? { ...prev, show_in_categories: checked } : prev)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing & Margin
            </CardTitle>
            <CardDescription>
              Configure currency conversion and profit margins
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* USD to BDT Rate */}
              <div className="space-y-2">
                <Label>USD to BDT Rate</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">৳</span>
                  <Input
                    type="number"
                    className="pl-8"
                    value={settings?.usd_to_bdt_rate || 120}
                    onChange={(e) =>
                      setSettings(prev =>
                        prev ? { ...prev, usd_to_bdt_rate: parseFloat(e.target.value) || 120 } : prev
                      )
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">1 USD = X BDT</p>
              </div>

              {/* Margin Type */}
              <div className="space-y-2">
                <Label>Margin Type</Label>
                <Select
                  value={settings?.default_margin_type || 'percentage'}
                  onValueChange={(value: 'percentage' | 'fixed') =>
                    setSettings(prev =>
                      prev ? { ...prev, default_margin_type: value } : prev
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Percentage
                      </div>
                    </SelectItem>
                    <SelectItem value="fixed">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Fixed Amount
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Margin Value */}
              <div className="space-y-2">
                <Label>
                  Margin Value {settings?.default_margin_type === 'percentage' ? '(%)' : '(BDT)'}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {settings?.default_margin_type === 'percentage' ? '%' : '৳'}
                  </span>
                  <Input
                    type="number"
                    className="pl-8"
                    value={settings?.default_margin_value || 30}
                    onChange={(e) =>
                      setSettings(prev =>
                        prev ? { ...prev, default_margin_value: parseFloat(e.target.value) || 0 } : prev
                      )
                    }
                  />
                </div>
              </div>
            </div>

            {/* Price Preview */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Price Preview</p>
              <p className="text-xs text-muted-foreground">
                Example: $10 USD product → ৳
                {settings?.default_margin_type === 'percentage'
                  ? Math.round(10 * (settings?.usd_to_bdt_rate || 120) * (1 + (settings?.default_margin_value || 30) / 100))
                  : Math.round(10 * (settings?.usd_to_bdt_rate || 120) + (settings?.default_margin_value || 0))
                } BDT
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Category Mapping */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Category Mapping
            </CardTitle>
            <CardDescription>
              Map CJ categories to your website categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CJ Category</TableHead>
                  <TableHead>Local Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commonCJCategories.map((cjCat) => {
                  const mapping = mappings.find(m => m.cj_category_name === cjCat);
                  const localCat = mapping?.local_category_id
                    ? categories.find(c => c.id === mapping.local_category_id)
                    : null;

                  return (
                    <TableRow key={cjCat}>
                      <TableCell className="font-medium">{cjCat}</TableCell>
                      <TableCell>
                        <Select
                          value={mapping?.local_category_id || "auto"}
                          onValueChange={(value) =>
                            handleMappingChange(cjCat, value === "auto" ? null : value)
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Auto-map" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto-map</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={localCat ? "default" : "secondary"}>
                          {localCat ? "Mapped" : "Auto"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={mapping?.is_enabled !== false}
                          onCheckedChange={(checked) =>
                            toggleMappingEnabled(cjCat, checked)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
