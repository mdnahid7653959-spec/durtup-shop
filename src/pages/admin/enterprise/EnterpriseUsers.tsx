import React, { useState, useEffect } from "react";
import { EnterpriseAdminLayout } from "@/components/admin/enterprise/EnterpriseAdminLayout";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs } from "firebase/firestore";
import { Users, Store, ShieldCheck, Wallet, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const EnterpriseUsers: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const uSnap = await getDocs(collection(db, "users"));
      const uList: any[] = [];
      uSnap.forEach((d) => uList.push({ id: d.id, ...d.data() }));
      setUsers(uList);

      const sSnap = await getDocs(collection(db, "sellers"));
      const sList: any[] = [];
      sSnap.forEach((d) => sList.push({ id: d.id, ...d.data() }));
      setSellers(sList);
    } catch (error) {
      console.error("Fetch users error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <EnterpriseAdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              User, Seller & RBAC Role Management
              <Badge className="bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400">FIRESTORE AUTH</Badge>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Verify seller KYC documents, manage buyer accounts, and assign role-based access control.
            </p>
          </div>

          <Button onClick={loadData} variant="outline" className="text-xs font-bold border-slate-300 dark:border-slate-700">
            <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* SELLERS TABLE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Store className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            Verified Marketplace Sellers ({sellers.length})
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Store Name</th>
                  <th className="p-3">Email / Phone</th>
                  <th className="p-3">KYC Verification</th>
                  <th className="p-3">Wallet Balance</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                {sellers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No sellers registered in Firestore
                    </td>
                  </tr>
                ) : (
                  sellers.map((sel) => (
                    <tr key={sel.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{sel.storeName || sel.name || "Seller Store"}</td>
                      <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{sel.email || sel.phone || "No contact"}</td>
                      <td className="p-3">
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">VERIFIED</Badge>
                      </td>
                      <td className="p-3 font-black text-emerald-600 dark:text-emerald-400">
                        ৳{(sel.walletBalance || 0).toLocaleString("en-BD")}
                      </td>
                      <td className="p-3">
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">ACTIVE</Badge>
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

