import React, { useState, useEffect } from "react";
import { EnterpriseAdminLayout } from "@/components/admin/enterprise/EnterpriseAdminLayout";
import { AdminCMSService, CMSLayoutConfig, CMSSection } from "@/services/admin/AdminCMSService";
import { AdminAuditLogService } from "@/services/admin/security/AdminAuditLogService";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  Palette,
  Eye,
  ArrowUp,
  ArrowDown,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  LayoutGrid,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export const EnterpriseCMSBuilder: React.FC = () => {
  const { adminUser, adminRole } = useAdminAuth();
  const { toast } = useToast();
  const [layout, setLayout] = useState<CMSLayoutConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCMS();
  }, []);

  const loadCMS = async () => {
    const data = await AdminCMSService.getHomepageLayout();
    setLayout(data);
  };

  const moveSection = (index: number, direction: "UP" | "DOWN") => {
    if (!layout) return;
    const newSections = [...layout.sections];
    const targetIndex = direction === "UP" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    // Update order numbers
    newSections.forEach((sec, i) => (sec.order = i + 1));
    setLayout({ ...layout, sections: newSections });
  };

  const toggleVisibility = (index: number) => {
    if (!layout) return;
    const newSections = [...layout.sections];
    newSections[index].isVisible = !newSections[index].isVisible;
    setLayout({ ...layout, sections: newSections });
  };

  const handleSaveCMS = async () => {
    if (!layout) return;
    setIsSaving(true);
    try {
      await AdminCMSService.saveHomepageLayout(layout);
      await AdminAuditLogService.logAction({
        adminId: adminUser?.uid || "ADMIN",
        adminEmail: adminUser?.email || "",
        adminRole: adminRole || "Admin",
        action: "CMS_LAYOUT_SAVE",
        module: "CMS_BUILDER",
        details: `Saved homepage visual layout with ${layout.sections.length} sections`,
        status: "SUCCESS"
      });

      toast({ title: "CMS Saved to Firestore", description: "Homepage layout live updated." });
    } catch (error) {
      toast({ title: "Save Failed", description: "Could not update CMS layout.", variant: "destructive" });
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
              Visual Drag & Drop Homepage Builder
              <Badge className="bg-orange-500/10 border border-orange-500/30 text-orange-400">REALTIME SYNC</Badge>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Rearrange sections, toggle visibility, and customize storefront theme tokens live.
            </p>
          </div>

          <Button
            onClick={handleSaveCMS}
            disabled={isSaving}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs gap-2 rounded-xl"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Publishing..." : "Publish Live to Storefront"}
          </Button>
        </div>

        {/* CMS SECTION BUILDER */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-orange-400" />
            Homepage Layout Section Pipeline
          </h3>

          <div className="space-y-3">
            {layout?.sections.map((section, index) => (
              <div
                key={section.id}
                className={`p-4 rounded-xl border flex items-center justify-between transition ${
                  section.isVisible ? "bg-slate-950 border-slate-800" : "bg-slate-950/40 border-slate-900 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-orange-400">
                    #{index + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {section.title}
                      <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                        {section.type}
                      </Badge>
                    </h4>
                    <p className="text-[11px] text-slate-400">Order Priority: {section.order}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => moveSection(index, "UP")}
                    disabled={index === 0}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveSection(index, "DOWN")}
                    disabled={index === (layout.sections.length - 1)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleVisibility(index)}
                    className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                      section.isVisible
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    <Eye className="h-4 w-4" />
                    {section.isVisible ? "VISIBLE" : "HIDDEN"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </EnterpriseAdminLayout>
  );
};
