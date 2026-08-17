import React, { useState, useEffect } from "react";
import { EnterpriseAdminLayout } from "@/components/admin/enterprise/EnterpriseAdminLayout";
import { db } from "@/integrations/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  Globe,
  Sliders,
  ShieldAlert,
  Megaphone,
  CreditCard,
  LayoutGrid,
  RefreshCcw,
  Save,
  Truck,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export const EnterpriseWebsiteControl: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [siteConfig, setSiteConfig] = useState({
    maintenanceMode: false,
    maintenanceMessage: "The website is temporarily under maintenance. We will be back shortly!",
    allowRegistration: true,
    allowGuestCheckout: true,
    showNoticeBanner: true,
    noticeText: "⚡ Shop best deals! Cash on delivery available nationwide!",
    noticeLink: "/products",
    enableCOD: true,
    enableBKash: true,
    enableNagad: true,
    enableCardPayment: true,
    minCheckoutAmount: 100,
    freeShippingThreshold: 1500,
    showFlashSale: true,
    showFreeShippingBanner: true,
    showBentoGrid: true,
    showAIRecommendations: true,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "site_settings", "website_control_center"));
      if (snap.exists()) {
        setSiteConfig((prev) => ({ ...prev, ...snap.data() }));
      }
    } catch (err) {
      console.error("Error loading site config:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "site_settings", "website_control_center"), {
        ...siteConfig,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      toast({
        title: "Website settings saved!",
        description: "Configuration updated on live website in real-time.",
      });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <EnterpriseAdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="h-6 w-6 text-orange-600" />
              Website Live Operating System Control Center
              <Badge className="bg-orange-500/10 border border-orange-500/30 text-orange-600 font-bold">
                REAL-TIME SYNC
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configure homepage layout, hero banner, header/footer, section visibility, payment gateway, and maintenance mode in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={loadConfig} className="text-xs font-bold border-slate-300">
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button onClick={handleSaveConfig} disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-500" /> Maintenance Mode
              </h2>
              <Switch checked={siteConfig.maintenanceMode} onCheckedChange={(val) => setSiteConfig({ ...siteConfig, maintenanceMode: val })} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold">Maintenance Notice Message</label>
              <Input value={siteConfig.maintenanceMessage} onChange={(e) => setSiteConfig({ ...siteConfig, maintenanceMessage: e.target.value })} className="text-xs" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-amber-500" /> Global Notice Banner
              </h2>
              <Switch checked={siteConfig.showNoticeBanner} onCheckedChange={(val) => setSiteConfig({ ...siteConfig, showNoticeBanner: val })} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold">Banner Text</label>
              <Input value={siteConfig.noticeText} onChange={(e) => setSiteConfig({ ...siteConfig, noticeText: e.target.value })} className="text-xs" />
            </div>
          </div>
        </div>
      </div>
    </EnterpriseAdminLayout>
  );
};
