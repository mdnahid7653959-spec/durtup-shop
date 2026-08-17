import React, { useState, useEffect } from "react";
import { EnterpriseAdminLayout } from "@/components/admin/enterprise/EnterpriseAdminLayout";
import { db } from "@/integrations/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  SlidersHorizontal,
  Palette,
  Type,
  Layout,
  RefreshCcw,
  Save,
  CheckCircle2,
  Sparkles,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export const EnterpriseThemeBuilder: React.FC = () => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [theme, setTheme] = useState({
    primaryColor: "#ea580c",
    secondaryColor: "#0f172a",
    fontFamily: "Inter",
    borderRadius: "12px",
    buttonStyle: "rounded-full",
    shadowStyle: "shadow-lg",
    headerLayout: "Sticky Standard",
    footerLayout: "4-Column Modern"
  });

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const snap = await getDoc(doc(db, "site_settings", "visual_theme_builder"));
      if (snap.exists()) {
        setTheme((prev) => ({ ...prev, ...snap.data() }));
      }
    } catch (err) {
      console.error("Error loading visual theme:", err);
    }
  };

  const handleSaveTheme = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "site_settings", "visual_theme_builder"), {
        ...theme,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      toast({
        title: "Theme design saved!",
        description: "Website visual styling updated in real-time.",
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
              <SlidersHorizontal className="h-6 w-6 text-orange-600" />
              Visual No-Code Theme Builder
              <Badge className="bg-orange-500/10 border border-orange-500/30 text-orange-600 font-bold">
                DRAG & DROP READY
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Customize website brand colors, typography, button styles, shadows, and layouts without coding.
            </p>
          </div>

          <Button onClick={handleSaveTheme} disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs gap-2">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Theme"}
          </Button>
        </div>

        {/* THEME CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-extrabold flex items-center gap-2">
              <Palette className="h-4 w-4 text-orange-600" /> Primary Color Scheme
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-bold">Primary Brand Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={theme.primaryColor} onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })} className="h-9 w-12 rounded cursor-pointer border" />
                <Input value={theme.primaryColor} onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })} className="text-xs font-mono" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-extrabold flex items-center gap-2">
              <Type className="h-4 w-4 text-blue-600" /> Typography & Fonts
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-bold">Font Family</label>
              <select value={theme.fontFamily} onChange={(e) => setTheme({ ...theme, fontFamily: e.target.value })} className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-800 text-xs px-3 bg-slate-50 dark:bg-slate-950 font-bold">
                <option value="Inter">Inter (Modern Clean)</option>
                <option value="Barlow">Barlow (Bold Tech)</option>
                <option value="Roboto">Roboto (Classic Standard)</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-extrabold flex items-center gap-2">
              <Layout className="h-4 w-4 text-purple-600" /> Button & Card Style
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-bold">Border Radius</label>
              <Input value={theme.borderRadius} onChange={(e) => setTheme({ ...theme, borderRadius: e.target.value })} className="text-xs font-mono" />
            </div>
          </div>
        </div>
      </div>
    </EnterpriseAdminLayout>
  );
};
