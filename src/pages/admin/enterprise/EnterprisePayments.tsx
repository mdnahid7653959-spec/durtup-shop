import React from "react";
import { EnterpriseAdminLayout } from "@/components/admin/enterprise/EnterpriseAdminLayout";
import { CreditCard, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const EnterprisePayments: React.FC = () => {
  return (
    <EnterpriseAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              Payment Gateway & Financial Ledger
              <Badge className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">SSL / bKash / Nagad</Badge>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Transaction logs, seller payouts, gateway settlement history, and refund ledger.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase">bKash Merchant</span>
            <h3 className="text-lg font-black text-white mt-1">৳420,500</h3>
            <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px] mt-2">SETTLED</Badge>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Nagad Merchant</span>
            <h3 className="text-lg font-black text-white mt-1">৳185,200</h3>
            <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px] mt-2">SETTLED</Badge>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase">SSLCommerz Cards</span>
            <h3 className="text-lg font-black text-white mt-1">৳95,400</h3>
            <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px] mt-2">SETTLED</Badge>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Cash on Delivery</span>
            <h3 className="text-lg font-black text-white mt-1">৳1,250,800</h3>
            <Badge className="bg-blue-500/10 text-blue-400 text-[10px] mt-2">IN TRANSIT</Badge>
          </div>
        </div>
      </div>
    </EnterpriseAdminLayout>
  );
};
