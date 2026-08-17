import React from "react";
import { EnterpriseAdminLayout } from "@/components/admin/enterprise/EnterpriseAdminLayout";
import { Truck, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const EnterpriseShipping: React.FC = () => {
  return (
    <EnterpriseAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              Courier Integration & Shipping Rules
              <Badge className="bg-sky-500/10 border border-sky-500/30 text-sky-400">STEADFAST / PATHAO</Badge>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure delivery charges inside/outside Dhaka, shipping zones, and API courier tracking.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
            <h3 className="text-sm font-bold text-white">Inside Dhaka Delivery Rate</h3>
            <p className="text-lg font-black text-emerald-400">৳60</p>
            <span className="text-[10px] text-slate-400">Standard 24-48 Hours Delivery</span>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
            <h3 className="text-sm font-bold text-white">Outside Dhaka Delivery Rate</h3>
            <p className="text-lg font-black text-emerald-400">৳120</p>
            <span className="text-[10px] text-slate-400">Standard 3-5 Days Delivery</span>
          </div>
        </div>
      </div>
    </EnterpriseAdminLayout>
  );
};
