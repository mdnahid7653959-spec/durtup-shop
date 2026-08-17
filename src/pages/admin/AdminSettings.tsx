import { useState, useEffect } from "react";
import { Save, Key, Store, Globe, Bell, Shield, Facebook, Search, Loader2, LifeBuoy, Percent, DollarSign, Calculator, TrendingUp, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { adminDb } from "@/lib/adminDb";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { 
  getPricingMarginConfig, 
  savePricingMarginConfig, 
  syncPricingMarginFromDb, 
  calculateProductPrice,
  type PricingMarginConfig 
} from "@/utils/pricingMargin";

export default function AdminSettings() {
  const { admin, changePassword } = useAdminAuth();
  const { toast } = useToast();
  const { settings, loading: settingsLoading, saveSettings } = useSiteSettings();
  const [saving, setSaving] = useState(false);
  const [savingMarketing, setSavingMarketing] = useState(false);
  
  // Profit Margin State
  const [pricingMargin, setPricingMargin] = useState<PricingMarginConfig>(getPricingMarginConfig());
  const [savingPricing, setSavingPricing] = useState(false);
  const [simBasePrice, setSimBasePrice] = useState<number>(950);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [storeSettings, setStoreSettings] = useState({
    storeName: "MegaMart",
    storeEmail: "support@megamart.com",
    storePhone: "+1 (555) 123-4567",
    storeAddress: "123 Commerce Street, New York, NY 10001",
    currency: "USD",
    timezone: "America/New_York",
  });

  const [marketingSettings, setMarketingSettings] = useState({
    // Facebook & Meta
    facebookPixelId: "",
    facebookConversionsApiToken: "",
    // Google
    googleAnalyticsId: "",
    googleTagManagerId: "",
    googleAdsConversionId: "",
    googleAdsConversionLabel: "",
    // TikTok
    tiktokPixelId: "",
    // Snapchat
    snapchatPixelId: "",
    // Pinterest
    pinterestTagId: "",
    // Twitter/X
    twitterPixelId: "",
    // Microsoft/Bing
    microsoftAdsTagId: "",
    // SEO
    defaultMetaTitle: "",
    defaultMetaDescription: "",
    ogImage: "",
  });

  const [notifications, setNotifications] = useState({
    newOrders: true,
    lowStock: true,
    newReviews: true,
    newUsers: false,
  });

  const [autoReply, setAutoReply] = useState({
    enabled: true,
    timeout_minutes: 10,
    message_bn: "",
    message_en: "",
  });
  const [savingAutoReply, setSavingAutoReply] = useState(false);

  // Load settings from database
  useEffect(() => {
    if (settings) {
      if (settings.store) {
        setStoreSettings(prev => ({ ...prev, ...settings.store }));
      }
      if (settings.marketing) {
        setMarketingSettings(prev => ({ ...prev, ...settings.marketing }));
      }
      if (settings.notifications) {
        setNotifications(prev => ({ ...prev, ...settings.notifications }));
      }
    }
  }, [settings]);

  // Load auto-reply and pricing margin config from site_settings
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "support_auto_reply")
        .maybeSingle();
      if (data?.value) {
        setAutoReply(prev => ({ ...prev, ...(data.value as any) }));
      }
    })();

    syncPricingMarginFromDb().then(cfg => {
      if (cfg) setPricingMargin(cfg);
    });
  }, []);

  const handlePricingSave = async () => {
    setSavingPricing(true);
    const success = await savePricingMarginConfig(pricingMargin);
    if (success) {
      toast({
        title: "Profit Margin Settings Saved!",
        description: pricingMargin.enabled
          ? `Active margin: ${pricingMargin.type === 'percentage' ? `+${pricingMargin.marginValue}%` : `+৳${pricingMargin.marginValue}`} applied to all products.`
          : "Profit margin disabled. Products will show direct supplier cost price.",
      });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Failed to save profit margin settings." });
    }
    setSavingPricing(false);
  };

  const handleAutoReplySave = async () => {
    setSavingAutoReply(true);
    const payload = {
      enabled: !!autoReply.enabled,
      timeout_minutes: Math.max(0, Number(autoReply.timeout_minutes) || 0),
      message_bn: autoReply.message_bn || "",
      message_en: autoReply.message_en || "",
    };
    const { error } = await adminDb.upsert("site_settings", {
      key: "support_auto_reply",
      value: payload,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Auto-reply settings saved" });
    }
    setSavingAutoReply(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "Passwords don't match" });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({ variant: "destructive", title: "Error", description: "Password must be at least 8 characters" });
      return;
    }

    setSaving(true);
    const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
    
    if (result.success) {
      toast({ title: "Password updated successfully" });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error });
    }
    setSaving(false);
  };

  const handleStoreSave = async () => {
    setSaving(true);
    const success = await saveSettings("store", storeSettings);
    if (success) {
      toast({ title: "Store settings saved successfully" });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Failed to save settings" });
    }
    setSaving(false);
  };

  const handleMarketingSave = async () => {
    setSavingMarketing(true);
    const success = await saveSettings("marketing", marketingSettings);
    if (success) {
      toast({ title: "Marketing & SEO settings saved successfully" });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Failed to save settings" });
    }
    setSavingMarketing(false);
  };

  const handleNotificationsSave = async () => {
    const success = await saveSettings("notifications", notifications);
    if (success) {
      toast({ title: "Notification preferences saved" });
    }
  };

  if (settingsLoading) {
    return (
      <AdminLayout title="Settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your store and account settings</p>
        </div>

        <Tabs defaultValue={new URLSearchParams(window.location.search).get("tab") || "store"} className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="pricing" className="gap-2">
              <Percent className="h-4 w-4" />
              Pricing & Profit Margin
            </TabsTrigger>
            <TabsTrigger value="store" className="gap-2">
              <Store className="h-4 w-4" />
              Store
            </TabsTrigger>
            <TabsTrigger value="marketing" className="gap-2">
              <Facebook className="h-4 w-4" />
              Marketing & SEO
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-2">
              <LifeBuoy className="h-4 w-4" />
              Support Auto-Reply
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pricing">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column: Margin Configuration (2 cols) */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-primary/20 shadow-sm">
                  <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Percent className="h-5 w-5 text-primary" />
                          Product Profit Margin Controls
                        </CardTitle>
                        <CardDescription>
                          Add your desired profit margin on top of supplier/API product prices across your entire store.
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-full border shadow-sm">
                        <Label htmlFor="margin-toggle" className="text-xs font-semibold cursor-pointer">
                          {pricingMargin.enabled ? "Margin ACTIVE" : "Direct Cost (OFF)"}
                        </Label>
                        <Switch
                          id="margin-toggle"
                          checked={pricingMargin.enabled}
                          onCheckedChange={(checked) => setPricingMargin({ ...pricingMargin, enabled: checked })}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    {/* Margin Mode Selection */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Margin Calculation Type</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPricingMargin({ ...pricingMargin, type: "percentage" })}
                          className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                            pricingMargin.type === "percentage"
                              ? "border-primary bg-primary/10 ring-1 ring-primary text-foreground"
                              : "border-border hover:border-muted-foreground/40 bg-card text-muted-foreground"
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                              <Percent className="h-4 w-4 text-primary" />
                              Percentage Markup (%)
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Add a percentage on top of base cost (e.g. +20%)
                            </div>
                          </div>
                          {pricingMargin.type === "percentage" && (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 ml-2" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setPricingMargin({ ...pricingMargin, type: "fixed" })}
                          className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                            pricingMargin.type === "fixed"
                              ? "border-primary bg-primary/10 ring-1 ring-primary text-foreground"
                              : "border-border hover:border-muted-foreground/40 bg-card text-muted-foreground"
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                              <DollarSign className="h-4 w-4 text-primary" />
                              Fixed Amount (৳)
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Add a fixed profit amount (e.g. +৳150 / product)
                            </div>
                          </div>
                          {pricingMargin.type === "fixed" && (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 ml-2" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Margin Value Input */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="margin-value" className="text-sm font-semibold">
                          Profit Margin Value ({pricingMargin.type === "percentage" ? "%" : "৳"})
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          {pricingMargin.type === "percentage"
                            ? `Increases prices by +${pricingMargin.marginValue}%`
                            : `Adds +৳${pricingMargin.marginValue} to each product`}
                        </span>
                      </div>
                      <div className="relative">
                        <Input
                          id="margin-value"
                          type="number"
                          min="0"
                          step={pricingMargin.type === "percentage" ? "1" : "10"}
                          value={pricingMargin.marginValue}
                          onChange={(e) =>
                            setPricingMargin({
                              ...pricingMargin,
                              marginValue: Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                          className="text-lg font-bold pl-3 pr-12 h-11"
                          placeholder="0"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                          {pricingMargin.type === "percentage" ? "%" : "৳"}
                        </div>
                      </div>

                      {/* Quick Preset Buttons */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="text-xs text-muted-foreground self-center mr-1">Quick Presets:</span>
                        {pricingMargin.type === "percentage" ? (
                          <>
                            {[0, 10, 15, 20, 25, 30, 40, 50].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => setPricingMargin({ ...pricingMargin, marginValue: pct })}
                                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                                  pricingMargin.marginValue === pct
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-muted/50 hover:bg-muted text-foreground border-border"
                                }`}
                              >
                                {pct === 0 ? "0% (Direct Cost)" : `+${pct}%`}
                              </button>
                            ))}
                          </>
                        ) : (
                          <>
                            {[0, 50, 100, 150, 200, 300, 500].map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => setPricingMargin({ ...pricingMargin, marginValue: amt })}
                                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                                  pricingMargin.marginValue === amt
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-muted/50 hover:bg-muted text-foreground border-border"
                                }`}
                              >
                                {amt === 0 ? "৳0 (Direct)" : `+৳${amt}`}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Strikethrough Regular Price Markup */}
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="regular-markup" className="text-sm font-semibold">
                          Regular / Strike-through Comparison Markup (%)
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          Creates crossed-out original price & discount badge
                        </span>
                      </div>
                      <div className="relative">
                        <Input
                          id="regular-markup"
                          type="number"
                          min="0"
                          max="200"
                          value={pricingMargin.regularPriceMarkupPercent}
                          onChange={(e) =>
                            setPricingMargin({
                              ...pricingMargin,
                              regularPriceMarkupPercent: Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                          className="pl-3 pr-12"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                          %
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Example: At 35%, a ৳1,000 product will show regular price ৳1,350 with a -26% discount badge.
                      </p>
                    </div>

                    {/* Psychological Rounding Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="space-y-0.5">
                        <Label htmlFor="rounding-toggle" className="text-sm font-semibold cursor-pointer">
                          Psychological Price Rounding (ends in 9 or 90)
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically rounds prices (e.g. ৳494 → ৳499) for better marketing appeal.
                        </p>
                      </div>
                      <Switch
                        id="rounding-toggle"
                        checked={pricingMargin.roundTo99}
                        onCheckedChange={(checked) => setPricingMargin({ ...pricingMargin, roundTo99: checked })}
                      />
                    </div>

                    <div className="pt-4">
                      <Button onClick={handlePricingSave} disabled={savingPricing} className="w-full sm:w-auto h-11 px-6">
                        {savingPricing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save & Apply Profit Margin Across Store
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Live Price Simulator Card (1 col) */}
              <div className="space-y-6">
                <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-md">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Calculator className="h-5 w-5 text-primary" />
                      Live Price Simulator
                    </CardTitle>
                    <CardDescription className="text-xs">
                      See exactly how products will appear to customers with current margin.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="sim-price" className="text-xs font-semibold">
                        Supplier / Base Cost (৳)
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="sim-price"
                          type="number"
                          value={simBasePrice}
                          onChange={(e) => setSimBasePrice(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="font-semibold pl-8"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                          ৳
                        </div>
                      </div>
                    </div>

                    {/* Calculated Outcome */}
                    {(() => {
                      const outcome = calculateProductPrice(simBasePrice, pricingMargin);
                      const profit = outcome.price - simBasePrice;
                      const discountPct = outcome.originalPrice > outcome.price
                        ? Math.round((1 - outcome.price / outcome.originalPrice) * 100)
                        : 0;

                      return (
                        <div className="rounded-xl bg-muted/60 p-4 space-y-3 border">
                          <div className="flex justify-between items-center text-xs text-muted-foreground pb-2 border-b border-border/50">
                            <span>Supplier Cost:</span>
                            <span className="font-semibold text-foreground">৳{simBasePrice.toLocaleString()}</span>
                          </div>

                          <div className="flex justify-between items-center text-xs text-muted-foreground pb-2 border-b border-border/50">
                            <span>Added Profit Margin:</span>
                            <span className={`font-semibold ${profit > 0 ? "text-green-600" : "text-foreground"}`}>
                              {profit > 0 ? `+৳${profit.toLocaleString()}` : "৳0 (Direct)"}
                            </span>
                          </div>

                          {/* Customer Price Display */}
                          <div className="pt-1">
                            <span className="text-xs font-medium text-muted-foreground block mb-1">
                              Displayed Customer Price:
                            </span>
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-2xl font-black text-primary">
                                ৳{outcome.price.toLocaleString()}
                              </span>
                              {outcome.originalPrice > outcome.price && (
                                <>
                                  <span className="text-sm text-muted-foreground line-through">
                                    ৳{outcome.originalPrice.toLocaleString()}
                                  </span>
                                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-red-500 text-white">
                                    -{discountPct}%
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Profit Highlight Badge */}
                          <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs">
                            <span className="font-medium text-muted-foreground">Net Margin Per Sale:</span>
                            <span className="font-bold text-green-600 bg-green-500/10 px-2 py-0.5 rounded">
                              {profit >= 0 ? `+৳${profit.toLocaleString()} Profit` : `৳0`}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="rounded-lg bg-primary/10 p-3 text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        Automatic Consistency
                      </div>
                      <p>
                        Once saved, this margin applies immediately across the Home page, Category pages, Search, Product Details, and Checkout.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="store">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Store Information
                </CardTitle>
                <CardDescription>
                  Basic information about your store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="storeName">Store Name</Label>
                    <Input
                      id="storeName"
                      value={storeSettings.storeName}
                      onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="storeEmail">Store Email</Label>
                    <Input
                      id="storeEmail"
                      type="email"
                      value={storeSettings.storeEmail}
                      onChange={(e) => setStoreSettings({ ...storeSettings, storeEmail: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="storePhone">Phone Number</Label>
                    <Input
                      id="storePhone"
                      value={storeSettings.storePhone}
                      onChange={(e) => setStoreSettings({ ...storeSettings, storePhone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={storeSettings.currency}
                      onChange={(e) => setStoreSettings({ ...storeSettings, currency: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="storeAddress">Store Address</Label>
                  <Textarea
                    id="storeAddress"
                    value={storeSettings.storeAddress}
                    onChange={(e) => setStoreSettings({ ...storeSettings, storeAddress: e.target.value })}
                  />
                </div>
                <Button onClick={handleStoreSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Marketing & SEO Tab */}
          <TabsContent value="marketing">
            <div className="space-y-6">
              {/* Facebook & Meta Platforms */}
              <Card className="border-blue-200 dark:border-blue-900">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Facebook className="h-5 w-5 text-blue-600" />
                    Facebook & Meta Platforms
                  </CardTitle>
                  <CardDescription>
                    Track conversions across Facebook, Instagram & Meta ads
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="facebookPixelId">Facebook Pixel ID</Label>
                      <Input
                        id="facebookPixelId"
                        placeholder="123456789012345"
                        value={marketingSettings.facebookPixelId}
                        onChange={(e) => setMarketingSettings({ ...marketingSettings, facebookPixelId: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Events Manager → Data Sources → Pixel ID
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="facebookConversionsApiToken">Conversions API Token (Optional)</Label>
                      <Input
                        id="facebookConversionsApiToken"
                        type="password"
                        placeholder="EAAxxxxxxxxxxxxxxx"
                        value={marketingSettings.facebookConversionsApiToken}
                        onChange={(e) => setMarketingSettings({ ...marketingSettings, facebookConversionsApiToken: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        For server-side tracking (recommended)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Google Platforms */}
              <Card className="border-green-200 dark:border-green-900">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google Platforms
                  </CardTitle>
                  <CardDescription>
                    Analytics, Tag Manager & Google Ads tracking
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="googleAnalyticsId">Google Analytics 4 ID</Label>
                      <Input
                        id="googleAnalyticsId"
                        placeholder="G-XXXXXXXXXX"
                        value={marketingSettings.googleAnalyticsId}
                        onChange={(e) => setMarketingSettings({ ...marketingSettings, googleAnalyticsId: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        GA4 Measurement ID from Admin → Data Streams
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="googleTagManagerId">Google Tag Manager ID</Label>
                      <Input
                        id="googleTagManagerId"
                        placeholder="GTM-XXXXXXX"
                        value={marketingSettings.googleTagManagerId}
                        onChange={(e) => setMarketingSettings({ ...marketingSettings, googleTagManagerId: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Container ID from GTM dashboard
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="googleAdsConversionId">Google Ads Conversion ID</Label>
                      <Input
                        id="googleAdsConversionId"
                        placeholder="AW-XXXXXXXXX"
                        value={marketingSettings.googleAdsConversionId}
                        onChange={(e) => setMarketingSettings({ ...marketingSettings, googleAdsConversionId: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Tools → Conversions → Tag setup
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="googleAdsConversionLabel">Conversion Label (Purchase)</Label>
                      <Input
                        id="googleAdsConversionLabel"
                        placeholder="xXxXxXxXxXxXxX"
                        value={marketingSettings.googleAdsConversionLabel}
                        onChange={(e) => setMarketingSettings({ ...marketingSettings, googleAdsConversionLabel: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Unique label for purchase tracking
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Social Media Pixels */}
              <Card className="border-purple-200 dark:border-purple-900">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.53.02C13.84 0 15.14.01 16.44.01c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                    </svg>
                    Social Media Pixels
                  </CardTitle>
                  <CardDescription>
                    Track conversions from TikTok, Snapchat, Pinterest & Twitter
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tiktokPixelId" className="flex items-center gap-2">
                        TikTok Pixel ID
                      </Label>
                      <Input
                        id="tiktokPixelId"
                        placeholder="CXXXXXXXXXXXXXXXXX"
                        value={marketingSettings.tiktokPixelId}
                        onChange={(e) => setMarketingSettings({ ...marketingSettings, tiktokPixelId: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        TikTok Ads Manager → Assets → Events
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="snapchatPixelId">Snapchat Pixel ID</Label>
                      <Input
                        id="snapchatPixelId"
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        value={marketingSettings.snapchatPixelId}
                        onChange={(e) => setMarketingSettings({ ...marketingSettings, snapchatPixelId: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Snap Ads Manager → Events Manager
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="pinterestTagId">Pinterest Tag ID</Label>
                      <Input
                        id="pinterestTagId"
                        placeholder="1234567890123"
                        value={marketingSettings.pinterestTagId}
                        onChange={(e) => setMarketingSettings({ ...marketingSettings, pinterestTagId: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Pinterest Ads → Conversions → Tag
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="twitterPixelId">Twitter/X Pixel ID</Label>
                      <Input
                        id="twitterPixelId"
                        placeholder="xxxxx"
                        value={marketingSettings.twitterPixelId}
                        onChange={(e) => setMarketingSettings({ ...marketingSettings, twitterPixelId: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        X Ads → Tools → Conversion tracking
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Microsoft/Bing */}
              <Card className="border-cyan-200 dark:border-cyan-900">
                <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/50 dark:to-blue-950/50 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <path d="M0 0v11.408l5.458 2.541V3.932L14.5 7.37v12.235l-9.042-4.122v6.025L24 24V6.803L0 0z" fill="#00A4EF"/>
                    </svg>
                    Microsoft Advertising
                  </CardTitle>
                  <CardDescription>
                    Track Bing & Microsoft Edge conversions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="max-w-md">
                    <Label htmlFor="microsoftAdsTagId">UET Tag ID</Label>
                    <Input
                      id="microsoftAdsTagId"
                      placeholder="123456789"
                      value={marketingSettings.microsoftAdsTagId}
                      onChange={(e) => setMarketingSettings({ ...marketingSettings, microsoftAdsTagId: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Microsoft Ads → Conversion tracking → UET tag
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* SEO Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-green-600" />
                    SEO Settings
                  </CardTitle>
                  <CardDescription>
                    Optimize your store for search engines
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="defaultMetaTitle">Default Meta Title</Label>
                    <Input
                      id="defaultMetaTitle"
                      placeholder="Your Store Name - Best Products Online"
                      value={marketingSettings.defaultMetaTitle}
                      onChange={(e) => setMarketingSettings({ ...marketingSettings, defaultMetaTitle: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: 50-60 characters
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="defaultMetaDescription">Default Meta Description</Label>
                    <Textarea
                      id="defaultMetaDescription"
                      placeholder="Describe your store and what makes it special..."
                      value={marketingSettings.defaultMetaDescription}
                      onChange={(e) => setMarketingSettings({ ...marketingSettings, defaultMetaDescription: e.target.value })}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: 150-160 characters for best display in search results
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="ogImage">Default Social Share Image URL</Label>
                    <Input
                      id="ogImage"
                      placeholder="https://yourstore.com/og-image.jpg"
                      value={marketingSettings.ogImage}
                      onChange={(e) => setMarketingSettings({ ...marketingSettings, ogImage: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended size: 1200x630 pixels for Facebook/Twitter sharing
                    </p>
                  </div>
                  <Button onClick={handleMarketingSave} disabled={savingMarketing}>
                    {savingMarketing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Marketing & SEO Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your admin password. Currently logged in as: <strong>{admin?.username}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters</p>
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New Orders</p>
                    <p className="text-sm text-muted-foreground">Get notified when you receive new orders</p>
                  </div>
                  <Switch
                    checked={notifications.newOrders}
                    onCheckedChange={(c) => setNotifications({ ...notifications, newOrders: c })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Low Stock Alerts</p>
                    <p className="text-sm text-muted-foreground">Get notified when products are running low</p>
                  </div>
                  <Switch
                    checked={notifications.lowStock}
                    onCheckedChange={(c) => setNotifications({ ...notifications, lowStock: c })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New Reviews</p>
                    <p className="text-sm text-muted-foreground">Get notified when customers leave reviews</p>
                  </div>
                  <Switch
                    checked={notifications.newReviews}
                    onCheckedChange={(c) => setNotifications({ ...notifications, newReviews: c })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New User Registrations</p>
                    <p className="text-sm text-muted-foreground">Get notified when new users sign up</p>
                  </div>
                  <Switch
                    checked={notifications.newUsers}
                    onCheckedChange={(c) => setNotifications({ ...notifications, newUsers: c })}
                  />
                </div>
                <Button onClick={handleNotificationsSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LifeBuoy className="h-5 w-5" />
                  Seller Support Auto-Reply
                </CardTitle>
                <CardDescription>
                  When a seller sends a message and no staff has replied within the timeout, an automatic
                  "we're busy" message is posted. Configure timing and templates below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">Enable Auto-Reply</p>
                    <p className="text-sm text-muted-foreground">Turn the automatic busy message on or off.</p>
                  </div>
                  <Switch
                    checked={autoReply.enabled}
                    onCheckedChange={(c) => setAutoReply({ ...autoReply, enabled: c })}
                  />
                </div>

                <div className="max-w-xs">
                  <Label htmlFor="ar-timeout">Trigger After (minutes of staff silence)</Label>
                  <Input
                    id="ar-timeout"
                    type="number"
                    min={0}
                    value={autoReply.timeout_minutes}
                    onChange={(e) => setAutoReply({ ...autoReply, timeout_minutes: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    If the last staff/admin reply is older than this (or none exists), auto-reply fires.
                  </p>
                </div>

                <div>
                  <Label htmlFor="ar-bn">Bangla Message Template</Label>
                  <Textarea
                    id="ar-bn"
                    rows={4}
                    value={autoReply.message_bn}
                    onChange={(e) => setAutoReply({ ...autoReply, message_bn: e.target.value })}
                    placeholder="All members of our support team are currently busy..."
                  />
                </div>

                <div>
                  <Label htmlFor="ar-en">English Message Template</Label>
                  <Textarea
                    id="ar-en"
                    rows={4}
                    value={autoReply.message_en}
                    onChange={(e) => setAutoReply({ ...autoReply, message_en: e.target.value })}
                    placeholder="Our support team is currently busy…"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Both messages will be sent together, separated by a blank line. Leave one empty to send only the other.
                  </p>
                </div>

                <Button onClick={handleAutoReplySave} disabled={savingAutoReply}>
                  {savingAutoReply ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Auto-Reply Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
