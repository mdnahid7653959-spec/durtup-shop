import React, { useState, useEffect } from "react";
import { EnterpriseAdminLayout } from "@/components/admin/enterprise/EnterpriseAdminLayout";
import { AdminCommissionService, CommissionSettings } from "@/services/admin/AdminCommissionService";
import { AdminAuditLogService } from "@/services/admin/security/AdminAuditLogService";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Percent, Save, RefreshCcw, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export const EnterpriseCommissions: React.FC = () => {
  const { adminUser, adminRole } = useAdminAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<CommissionSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const data = await AdminCommissionService.getCommissionSettings();
    setSettings(data);
  };

  const handleSaveCommissions = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await AdminCommissionService.saveCommissionSettings(settings);
      await AdminAuditLogService.logAction({
        adminId: adminUser?.uid || "ADMIN",
        adminEmail: adminUser?.email || "",
        adminRole: adminRole || "Admin",
        action: "COMMISSION_SETTINGS_UPDATE",
        module: "COMMISSION_ENGINE",
        details: `Updated marketplace global commission rate to ${settings.globalRate}%`,
        status: "SUCCESS"
      });

      toast({ title: "Commissions Updated", description: "Marketplace commission rates saved live to Firestore." });
    } catch (error) {
      toast({ title: "Save Failed", description: "Could not update commission settings.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <EnterpriseAdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              Dynamic Marketplace Commission System
              <Badge className="bg-orange-500/10 border border-orange-500/30 text-orange-400">STOREFRONT SYNC</Badge>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure global, category, brand, and seller specific profit commission rates.
            </p>
          </div>

          <Button
            onClick={handleSaveCommissions}
            disabled={isSaving}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs gap-2 rounded-xl"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Commission Rates"}
          </Button>
        </div>

        {/* GLOBAL RATE CARD */}
        {settings && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Percent className="h-4 w-4 text-orange-400" />
              Global Marketplace Commission Rate
            </h3>

            <div className="max-w-md bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Standard Commission (%)
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={settings.globalRate}
                  onChange={(e) => setSettings({ ...settings, globalRate: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-900 border-slate-700 text-white font-mono text-base"
                />
                <span className="text-lg font-black text-orange-400">%</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Applied automatically across all marketplace products unless category/seller overrides are set.
              </p>
            </div>
          </div>
        )}
      </div>
    </EnterpriseAdminLayout>
  );
};
