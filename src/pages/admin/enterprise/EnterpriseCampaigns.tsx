import React from "react";
import { EnterpriseAdminLayout } from "@/components/admin/enterprise/EnterpriseAdminLayout";
import { Megaphone, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const EnterpriseCampaigns: React.FC = () => {
  return (
    <EnterpriseAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              Campaigns, Coupons & Flash Sale Management
              <Badge className="bg-orange-500/10 border border-orange-500/30 text-orange-400">LIVE PROMOTIONS</Badge>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Create discount promo codes, manage seasonal mega sales, and trigger referral campaigns.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
            <h3 className="text-sm font-bold text-white">Mega Eid Campaign 2026</h3>
            <p className="text-xs text-slate-400">Flat 20% discount on all fashion & leather goods.</p>
            <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px]">ACTIVE NOW</Badge>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
            <h3 className="text-sm font-bold text-white">Coupon: DURTUP100</h3>
            <p className="text-xs text-slate-400">৳100 Off on orders above ৳1,000.</p>
            <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px]">VALID</Badge>
          </div>
        </div>
      </div>
    </EnterpriseAdminLayout>
  );
};
