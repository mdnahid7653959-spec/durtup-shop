import React, { useState, useEffect } from "react";
import { EnterpriseAdminLayout } from "@/components/admin/enterprise/EnterpriseAdminLayout";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { AdminSupplierEngine } from "@/services/admin/AdminSupplierEngine";
import { AdminAuditLogService } from "@/services/admin/security/AdminAuditLogService";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  ShoppingCart,
  Send,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  RefreshCcw,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export const EnterpriseOrders: React.FC = () => {
  const { adminUser, adminRole } = useAdminAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, "orders"));
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setOrders(list);
    } catch (error) {
      console.error("Fetch orders error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      await AdminAuditLogService.logAction({
        adminId: adminUser?.uid || "ADMIN",
        adminEmail: adminUser?.email || "",
        adminRole: adminRole || "Admin",
        action: "ORDER_STATUS_UPDATE",
        module: "ORDERS_PIPELINE",
        details: `Updated order #${orderId.slice(0, 8)} status to ${newStatus}`,
        targetId: orderId,
        status: "SUCCESS"
      });

      toast({ title: "Order Updated", description: `Order status changed to ${newStatus}.` });
      loadOrders();
    } catch (error) {
      toast({ title: "Update Failed", description: "Could not update order status.", variant: "destructive" });
    }
  };

  return (
    <EnterpriseAdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              Enterprise Order Pipeline & Sync Center
              <Badge className="bg-orange-500/10 border border-orange-500/30 text-orange-400">REALTIME SYNC</Badge>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Track customer purchases, update order pipeline states, and trigger automated supplier forwarding.
            </p>
          </div>

          <Button onClick={loadOrders} className="bg-slate-800 text-slate-200 text-xs border border-slate-700">
            <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* ORDER PIPELINE TABLE */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Supplier Forward</th>
                  <th className="p-3">Pipeline Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200 font-medium">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      No orders recorded in Firestore
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-800/50 transition">
                      <td className="p-3 font-mono font-bold text-orange-400">#{ord.id.slice(0, 8)}</td>
                      <td className="p-3">
                        <p className="font-bold text-white">{ord.customerName || ord.name || "Marketplace Customer"}</p>
                        <p className="text-[10px] text-slate-400">{ord.phone || ord.email || "No contact info"}</p>
                      </td>
                      <td className="p-3 font-black text-emerald-400">
                        ৳{(ord.totalAmount || ord.price || 0).toLocaleString("en-BD")}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] text-slate-300 border-slate-700">
                          {ord.paymentMethod || "COD"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {ord.supplierOrderId ? (
                          <Badge className="bg-sky-500/10 text-sky-400 text-[10px]">
                            {ord.supplierOrderId}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-slate-500">Local Warehouse</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Select
                          value={ord.status || "CONFIRMED"}
                          onValueChange={(val) => handleUpdateOrderStatus(ord.id, val)}
                        >
                          <SelectTrigger className="h-8 w-36 bg-slate-950 border-slate-800 text-xs text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                            <SelectItem value="PROCESSING">Processing</SelectItem>
                            <SelectItem value="PACKED">Packed</SelectItem>
                            <SelectItem value="SHIPPED">Shipped</SelectItem>
                            <SelectItem value="DELIVERED">Delivered</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            <SelectItem value="REFUNDED">Refunded</SelectItem>
                          </SelectContent>
                        </Select>
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
