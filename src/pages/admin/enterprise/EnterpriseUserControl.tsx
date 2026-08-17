import React, { useState, useEffect } from "react";
import { EnterpriseAdminLayout } from "@/components/admin/enterprise/EnterpriseAdminLayout";
import { db } from "@/integrations/firebase/client";
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from "firebase/firestore";
import {
  Sliders,
  ShieldAlert,
  Megaphone,
  CreditCard,
  UserCheck,
  LayoutGrid,
  CheckCircle2,
  RefreshCcw,
  Save,
  Users,
  Search,
  Lock,
  Unlock,
  AlertTriangle,
  Gift,
  Truck,
  Sparkles,
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export const EnterpriseUserControl: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // User Panel Control Settings State
  const [controls, setControls] = useState({
    // Maintenance Mode
    maintenanceMode: false,
    maintenanceMessage: "The website is temporarily under maintenance. We will be back shortly!",
    
    // User Auth & Signup
    allowRegistration: true,
    allowGuestCheckout: true,
    requireEmailVerification: false,
    
    // Global Notice Banner
    showNoticeBanner: true,
    noticeText: "⚡ Shop best deals! Cash on delivery available nationwide!",
    noticeLink: "/products",
    
    // Payment Methods for Users
    enableCOD: true,
    enableBKash: true,
    enableNagad: true,
    enableCardPayment: true,
    minCheckoutAmount: 100,
    freeShippingThreshold: 1500,

    // Feature Toggles for User Panel
    showFlashSale: true,
    showFreeShippingBanner: true,
    showBentoGrid: true,
    showAIRecommendations: true,
    allowProductReviews: true,
  });

  // User Management state
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadSettings();
    loadUsers();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, "site_settings", "user_panel_config");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setControls((prev) => ({ ...prev, ...snap.data() }));
      }
    } catch (err) {
      console.error("Error loading user control settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setUsers(list);
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "site_settings", "user_panel_config"), {
        ...controls,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Save to localStorage for instant local client response
      localStorage.setItem("user_panel_config", JSON.stringify(controls));

      toast({
        title: "Settings saved!",
        description: "User panel controls updated in real-time.",
      });
    } catch (err: any) {
      toast({
        title: "Save failed!",
        description: err.message || "Unable to save settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        isBlocked: !currentStatus,
        updatedAt: new Date().toISOString(),
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isBlocked: !currentStatus } : u))
      );

      toast({
        title: !currentStatus ? "User blocked" : "User unblocked",
        description: `User ID ${userId} updated.`,
      });
    } catch (err: any) {
      toast({
        title: "Status update error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.includes(searchQuery)
  );

  return (
    <EnterpriseAdminLayout>
      <div className="space-y-6">
        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="h-6 w-6 text-orange-600" />
              User Panel Control Center
              <Badge className="bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400">
                LIVE CONTROLLER
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Control maintenance mode, registration policy, payment options, banners, and features in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadSettings}
              className="border-slate-300 dark:border-slate-700 text-xs font-bold gap-1.5"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs gap-2 shadow-md shadow-orange-600/20"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>

        {/* CONTROLS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SECTION 1: MAINTENANCE & SITE STATUS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-500" />
                Maintenance Mode & Site Access
              </h2>
              <Switch
                checked={controls.maintenanceMode}
                onCheckedChange={(val) => setControls({ ...controls, maintenanceMode: val })}
              />
            </div>

            {controls.maintenanceMode && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Maintenance mode is active! Users visiting the site will see the maintenance notice.
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Maintenance Notice Message
              </label>
              <Input
                value={controls.maintenanceMessage}
                onChange={(e) => setControls({ ...controls, maintenanceMessage: e.target.value })}
                className="text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800"
                placeholder="Enter maintenance message for users"
              />
            </div>
          </div>

          {/* SECTION 2: USER REGISTRATION & AUTH POLICY */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-blue-500" />
                Registration & Guest Account Policy
              </h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">New User Registration</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Enable or disable new user signups</p>
                </div>
                <Switch
                  checked={controls.allowRegistration}
                  onCheckedChange={(val) => setControls({ ...controls, allowRegistration: val })}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Guest Checkout</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Allow users to place orders without logging in</p>
                </div>
                <Switch
                  checked={controls.allowGuestCheckout}
                  onCheckedChange={(val) => setControls({ ...controls, allowGuestCheckout: val })}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: NOTICE BANNER CONTROL */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-amber-500" />
                Global Notice Banner (Header Notice)
              </h2>
              <Switch
                checked={controls.showNoticeBanner}
                onCheckedChange={(val) => setControls({ ...controls, showNoticeBanner: val })}
              />
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Banner Message / Text
                </label>
                <Input
                  value={controls.noticeText}
                  onChange={(e) => setControls({ ...controls, noticeText: e.target.value })}
                  className="text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800"
                  placeholder="e.g. Special Offer! 10% Cashback on orders"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Banner Action Link
                </label>
                <Input
                  value={controls.noticeLink}
                  onChange={(e) => setControls({ ...controls, noticeLink: e.target.value })}
                  className="text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 font-mono"
                  placeholder="/products"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: PAYMENT METHODS & CHECKOUT RULES */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-500" />
                Payment Methods & Checkout Rules
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Cash on Delivery (COD)</span>
                <Switch
                  checked={controls.enableCOD}
                  onCheckedChange={(val) => setControls({ ...controls, enableCOD: val })}
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">bKash</span>
                <Switch
                  checked={controls.enableBKash}
                  onCheckedChange={(val) => setControls({ ...controls, enableBKash: val })}
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Nagad</span>
                <Switch
                  checked={controls.enableNagad}
                  onCheckedChange={(val) => setControls({ ...controls, enableNagad: val })}
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Card Payment</span>
                <Switch
                  checked={controls.enableCardPayment}
                  onCheckedChange={(val) => setControls({ ...controls, enableCardPayment: val })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Minimum Order (৳)</label>
                <Input
                  type="number"
                  value={controls.minCheckoutAmount}
                  onChange={(e) => setControls({ ...controls, minCheckoutAmount: Number(e.target.value) })}
                  className="text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Free Shipping Min Order (৳)</label>
                <Input
                  type="number"
                  value={controls.freeShippingThreshold}
                  onChange={(e) => setControls({ ...controls, freeShippingThreshold: Number(e.target.value) })}
                  className="text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: FEATURE VISIBILITY TOGGLES */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-indigo-500" />
              User Panel Features & Section Visibility
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Flash Sale Section</span>
              </div>
              <Switch
                checked={controls.showFlashSale}
                onCheckedChange={(val) => setControls({ ...controls, showFlashSale: val })}
              />
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Free Shipping Banner</span>
              </div>
              <Switch
                checked={controls.showFreeShippingBanner}
                onCheckedChange={(val) => setControls({ ...controls, showFreeShippingBanner: val })}
              />
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">AI Product Recommendations</span>
              </div>
              <Switch
                checked={controls.showAIRecommendations}
                onCheckedChange={(val) => setControls({ ...controls, showAIRecommendations: val })}
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: USER ACCOUNTS & LIVE STATUS CONTROL */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-600" />
              Live User Accounts ({users.length})
            </h2>

            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by email / name..."
                className="pl-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 h-9"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">User Email / Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-3 font-bold">
                        <div>{u.name || u.displayName || "User"}</div>
                        <div className="text-[11px] font-mono text-slate-400">{u.email || u.id}</div>
                      </td>
                      <td className="p-3 font-mono text-slate-500">{u.phone || "N/A"}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] uppercase border-slate-300 dark:border-slate-700">
                          {u.role || "Buyer"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {u.isBlocked ? (
                          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px]">
                            BLOCKED
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                            ACTIVE
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleUserStatus(u.id, !!u.isBlocked)}
                          className={`text-xs font-bold gap-1 h-7 ${
                            u.isBlocked
                              ? "border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                              : "border-rose-300 text-rose-600 hover:bg-rose-50"
                          }`}
                        >
                          {u.isBlocked ? (
                            <>
                              <Unlock className="h-3 w-3" /> Unblock
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3" /> Block
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </EnterpriseAdminLayout>
  );
};
