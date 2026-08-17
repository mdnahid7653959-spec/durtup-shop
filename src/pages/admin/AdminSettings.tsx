import { useState, useEffect } from "react";
import { Save, Key, Store, Globe, Bell, Shield, Facebook, Search, Loader2, LifeBuoy } from "lucide-react";
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

export default function AdminSettings() {
  const { admin, changePassword } = useAdminAuth();
  const { toast } = useToast();
  const { settings, loading: settingsLoading, saveSettings } = useSiteSettings();
  const [saving, setSaving] = useState(false);
  const [savingMarketing, setSavingMarketing] = useState(false);
  
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

  // Load auto-reply config from site_settings
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
  }, []);

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
