import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/firebaseAdapter";
import { adminDb } from "@/lib/adminDb";

interface Promo {
  id: number | string;
  title: string;
  description: string;
  code?: string;
  icon: string;
  bgClass: string;
  href: string;
}

interface TrustBadge {
  icon: string;
  title: string;
  desc: string;
  gradient: string;
}

interface PromosConfig {
  promos: Promo[];
  trust_badges: TrustBadge[];
}

const iconOptions = ["gift", "percent", "crown", "truck", "shield", "zap", "star", "headphones", "credit-card", "award", "heart"];

const gradientPresets = [
  "from-emerald-500 via-teal-500 to-cyan-500",
  "from-rose-500 via-pink-500 to-fuchsia-500",
  "from-amber-500 via-orange-500 to-red-500",
  "from-blue-500 to-indigo-600",
  "from-green-500 to-emerald-600",
  "from-orange-500 to-amber-600",
  "from-purple-500 to-violet-600",
  "from-slate-700 to-slate-900",
];

const defaultConfig: PromosConfig = {
  promos: [
    { id: 1, title: "Welcome Offer", description: "New users get 15% off first order", code: "WELCOME15", icon: "gift", bgClass: "from-emerald-500 via-teal-500 to-cyan-500", href: "/register" },
    { id: 2, title: "Super Deals", description: "Up to 80% off selected items", icon: "percent", bgClass: "from-rose-500 via-pink-500 to-fuchsia-500", href: "/clearance" },
    { id: 3, title: "Premium Club", description: "Free shipping + VIP deals", icon: "crown", bgClass: "from-amber-500 via-orange-500 to-red-500", href: "/premium" },
  ],
  trust_badges: [
    { icon: "truck", title: "Free Shipping", desc: "On orders $25+", gradient: "from-blue-500 to-indigo-600" },
    { icon: "shield", title: "Buyer Protection", desc: "100% secure", gradient: "from-green-500 to-emerald-600" },
    { icon: "zap", title: "Fast Delivery", desc: "2-7 days", gradient: "from-orange-500 to-amber-600" },
    { icon: "star", title: "Top Quality", desc: "5-star rated", gradient: "from-purple-500 to-violet-600" },
  ],
};

export default function AdminHomePromos() {
  const [config, setConfig] = useState<PromosConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("site_config")
      .select("value")
      .eq("key", "home_promos")
      .maybeSingle();
    if (!error && data?.value) {
      const v = data.value as PromosConfig;
      setConfig({
        promos: v.promos?.length ? v.promos : defaultConfig.promos,
        trust_badges: v.trust_badges?.length ? v.trust_badges : defaultConfig.trust_badges,
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await adminDb.upsert("site_config", { key: "home_promos", value: config });
    setSaving(false);
    if (error) toast.error(error.message || "Save failed");
    else {
      toast.success("Home promos saved");
      try { localStorage.setItem("site-config:home_promos", JSON.stringify(config)); } catch {}
    }
  };

  const updatePromo = (i: number, patch: Partial<Promo>) => {
    const next = [...config.promos];
    next[i] = { ...next[i], ...patch };
    setConfig({ ...config, promos: next });
  };
  const removePromo = (i: number) => setConfig({ ...config, promos: config.promos.filter((_, x) => x !== i) });
  const addPromo = () => setConfig({
    ...config,
    promos: [...config.promos, { id: Date.now(), title: "New Promo", description: "Description", icon: "gift", bgClass: gradientPresets[0], href: "/" }],
  });

  const updateBadge = (i: number, patch: Partial<TrustBadge>) => {
    const next = [...config.trust_badges];
    next[i] = { ...next[i], ...patch };
    setConfig({ ...config, trust_badges: next });
  };
  const removeBadge = (i: number) => setConfig({ ...config, trust_badges: config.trust_badges.filter((_, x) => x !== i) });
  const addBadge = () => setConfig({
    ...config,
    trust_badges: [...config.trust_badges, { icon: "shield", title: "New Badge", desc: "Description", gradient: gradientPresets[3] }],
  });

  return (
    <AdminLayout title="Home Promos & Trust Badges">
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">Edit the promo cards and trust badges shown on the homepage.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" /> Reload
            </Button>
            <Button onClick={save} disabled={saving}>
              <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Promo Cards</CardTitle>
                <CardDescription>3-column promotional cards below hero</CardDescription>
              </div>
              <Button size="sm" onClick={addPromo}><Plus className="h-4 w-4 mr-2" /> Add Promo</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.promos.map((p, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Promo #{i + 1}</span>
                  <Button size="icon" variant="ghost" onClick={() => removePromo(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div><Label>Title</Label><Input value={p.title} onChange={(e) => updatePromo(i, { title: e.target.value })} /></div>
                  <div><Label>Description</Label><Input value={p.description} onChange={(e) => updatePromo(i, { description: e.target.value })} /></div>
                  <div><Label>Coupon Code (optional)</Label><Input value={p.code || ""} onChange={(e) => updatePromo(i, { code: e.target.value || undefined })} /></div>
                  <div><Label>Link URL</Label><Input value={p.href} onChange={(e) => updatePromo(i, { href: e.target.value })} /></div>
                  <div>
                    <Label>Icon</Label>
                    <select className="w-full h-10 rounded-md border bg-background px-3" value={p.icon} onChange={(e) => updatePromo(i, { icon: e.target.value })}>
                      {iconOptions.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Gradient</Label>
                    <select className="w-full h-10 rounded-md border bg-background px-3" value={p.bgClass} onChange={(e) => updatePromo(i, { bgClass: e.target.value })}>
                      {gradientPresets.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div className={`h-16 rounded-lg bg-gradient-to-br ${p.bgClass}`} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Trust Badges</CardTitle>
                <CardDescription>Small feature badges (Free Shipping, Secure Pay, etc.)</CardDescription>
              </div>
              <Button size="sm" onClick={addBadge}><Plus className="h-4 w-4 mr-2" /> Add Badge</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.trust_badges.map((b, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Badge #{i + 1}</span>
                  <Button size="icon" variant="ghost" onClick={() => removeBadge(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div><Label>Title</Label><Input value={b.title} onChange={(e) => updateBadge(i, { title: e.target.value })} /></div>
                  <div><Label>Description</Label><Input value={b.desc} onChange={(e) => updateBadge(i, { desc: e.target.value })} /></div>
                  <div>
                    <Label>Icon</Label>
                    <select className="w-full h-10 rounded-md border bg-background px-3" value={b.icon} onChange={(e) => updateBadge(i, { icon: e.target.value })}>
                      {iconOptions.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Gradient</Label>
                    <select className="w-full h-10 rounded-md border bg-background px-3" value={b.gradient} onChange={(e) => updateBadge(i, { gradient: e.target.value })}>
                      {gradientPresets.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
