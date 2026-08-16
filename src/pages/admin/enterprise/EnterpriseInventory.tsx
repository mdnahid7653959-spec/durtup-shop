import React from "react";
import { EnterpriseAdminLayout } from "@/components/admin/enterprise/EnterpriseAdminLayout";
import { Boxes, Building2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const EnterpriseInventory: React.FC = () => {
  return (
    <EnterpriseAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              Multi-Warehouse Inventory & Stock Tracking
              <Badge className="bg-orange-500/10 border border-orange-500/30 text-orange-400">FIRESTORE SYNC</Badge>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage warehouse stock locations, low-stock threshold triggers, and purchase orders.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Main Dhaka Central Hub</span>
            <h3 className="text-xl font-black text-white">12,450 Units</h3>
            <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px]">OPERATIONAL</Badge>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Chittagong Port Warehouse</span>
            <h3 className="text-xl font-black text-white">4,820 Units</h3>
            <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px]">OPERATIONAL</Badge>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Low Stock Alerts</span>
            <h3 className="text-xl font-black text-amber-400">14 Items Low</h3>
            <Badge className="bg-amber-500/10 text-amber-400 text-[10px]">ACTION REQUIRED</Badge>
          </div>
        </div>
      </div>
    </EnterpriseAdminLayout>
  );
};
