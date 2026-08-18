import { Printer, X, CheckCircle2, ShieldCheck, QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PrintableInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  orderItems: any[];
  customerInfo?: any;
}

export function PrintableInvoiceModal({
  open,
  onOpenChange,
  order,
  orderItems,
  customerInfo,
}: PrintableInvoiceModalProps) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatAddr = (addr: any) => {
    if (!addr) return "N/A";
    if (typeof addr === "string") return addr;
    return [
      addr.name || addr.fullName || addr.full_name,
      addr.address_line1 || addr.street || addr.address,
      addr.city,
      addr.state,
      addr.postal_code || addr.zip,
      addr.country || "Bangladesh",
    ]
      .filter(Boolean)
      .join(", ");
  };

  const formattedDate = new Date(order.created_at || Date.now()).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isPaid = order.payment_status?.toLowerCase() === "paid" || order.payment_status?.toLowerCase() === "completed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[94vh] overflow-y-auto p-0 border shadow-2xl bg-slate-900 text-slate-100">
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="flex items-center justify-between p-4 bg-slate-800/90 border-b border-slate-700 print:hidden sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-orange-500" />
            <span className="font-semibold text-white">Printable Invoice Preview</span>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="default" 
              size="sm" 
              onClick={handlePrint}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-md gap-1.5"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Printable Document Area (Clean, ultra-premium white paper layout) */}
        <div className="p-8 sm:p-12 bg-white text-slate-900 font-sans print:p-0 print:m-0 min-h-[842px]">
          {/* Top Brand Bar */}
          <div className="h-2 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-t mb-8 print:mb-6" />

          {/* Header Section */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img
                  src="/durtup-logo.png"
                  alt="Durtup.shop"
                  className="h-10 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <span className="text-2xl font-black tracking-tight text-slate-900">
                  DURTUP<span className="text-orange-500">.SHOP</span>
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-700">Official E-Commerce Marketplace</p>
              <p className="text-[11px] text-slate-500 mt-0.5">House 42, Road 11, Banani C/A, Dhaka-1213, Bangladesh</p>
              <p className="text-[11px] text-slate-500">
                BIN: 004829104-0102 • Email: <span className="text-slate-700 font-medium">support@durtup.shop</span> • Web: <span className="text-slate-700 font-medium">https://durtup.shop</span>
              </p>
            </div>

            <div className="text-right">
              <div className="inline-block bg-slate-900 text-white px-4 py-1.5 rounded-lg shadow-xs mb-2">
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-300">TAX INVOICE</p>
                <p className="text-sm font-extrabold tracking-tight">#INV-{order.order_number}</p>
              </div>
              <div className="text-xs text-slate-600 space-y-0.5">
                <p><span className="text-slate-400">Date:</span> <span className="font-semibold text-slate-800">{formattedDate}</span></p>
                <p>
                  <span className="text-slate-400">Payment Status:</span>{" "}
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase ${
                    isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {order.payment_status || "Pending"}
                  </span>
                </p>
                <p><span className="text-slate-400">Payment Method:</span> <span className="font-semibold text-slate-800 uppercase">{order.payment_method || "Cash On Delivery"}</span></p>
              </div>
            </div>
          </div>

          {/* Customer & Shipping Addresses (2 Columns) */}
          <div className="grid grid-cols-2 gap-6 my-6 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-400 uppercase font-bold text-[10px] tracking-wider mb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-orange-500" />
                <span>Billed To</span>
              </div>
              <p className="font-bold text-slate-900 text-sm">
                {customerInfo?.full_name || order.shipping_address?.name || "Valued Customer"}
              </p>
              <p className="text-slate-600 mt-0.5 font-medium">{customerInfo?.email || order.customer_email || "N/A"}</p>
              <p className="text-slate-600 font-medium">Phone: {customerInfo?.phone || order.shipping_address?.phone || "N/A"}</p>
              <p className="text-slate-600 mt-1.5 leading-relaxed">{formatAddr(order.billing_address || order.shipping_address)}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-400 uppercase font-bold text-[10px] tracking-wider mb-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Shipped / Deliver To</span>
              </div>
              <p className="font-bold text-slate-900 text-sm">
                {order.shipping_address?.name || customerInfo?.full_name || "Recipient"}
              </p>
              <p className="text-slate-600 mt-0.5 font-medium">Phone: {order.shipping_address?.phone || customerInfo?.phone || "N/A"}</p>
              <p className="text-slate-600 mt-1.5 leading-relaxed">{formatAddr(order.shipping_address)}</p>
              {order.courier_name && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Courier: <span className="font-semibold text-slate-700">{order.courier_name}</span>
                </p>
              )}
            </div>
          </div>

          {/* Product Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden my-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold">
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3">Variant / SKU</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orderItems.map((item, idx) => (
                  <tr key={item.id || idx} className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
                    <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900 leading-snug">{item.product_name}</p>
                      {item.product_id && (
                        <span className="text-[10px] text-slate-400 font-mono">ID: {item.product_id}</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 font-medium">{item.variant_name || item.sku || "Standard"}</td>
                    <td className="p-3 text-center font-bold text-slate-800">{item.quantity}</td>
                    <td className="p-3 text-right text-slate-700 font-medium">৳{(item.price || 0).toLocaleString()}</td>
                    <td className="p-3 text-right font-extrabold text-slate-900">৳{(item.total || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Summary & Payment Notes */}
          <div className="grid grid-cols-2 gap-6 my-6 items-start">
            {/* Left side: Notes & Transaction details */}
            <div className="space-y-3">
              {order.notes && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900">
                  <span className="font-bold">Order Note / Transaction: </span>
                  {order.notes}
                </div>
              )}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">Payment & Verification Details:</p>
                <p>• Method: <span className="font-semibold text-slate-700 uppercase">{order.payment_method || "Cash On Delivery"}</span></p>
                <p>• Status: <span className="font-semibold text-slate-700">{order.payment_status || "Pending Verification"}</span></p>
                <p>• Security Code: <span className="font-mono text-slate-500 font-semibold">{order.order_number?.slice(0, 16)}</span></p>
              </div>
            </div>

            {/* Right side: Calculation Breakdown */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({orderItems.length} items):</span>
                <span className="font-medium text-slate-800">৳{(order.subtotal || 0).toLocaleString()}</span>
              </div>
              {(order.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount Savings:</span>
                  <span>-৳{order.discount_amount.toLocaleString()}</span>
                </div>
              )}
              {(order.tax_amount || 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Estimated Tax / VAT:</span>
                  <span>৳{order.tax_amount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Shipping & Handling:</span>
                <span className="font-medium text-slate-800">৳{(order.shipping_cost || 0).toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-300 pt-2.5 mt-2 flex justify-between items-center">
                <span className="font-black text-slate-900 text-sm">Grand Total:</span>
                <span className="font-black text-orange-600 text-lg">৳{(order.total || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Terms & Official Seal Signature Footer */}
          <div className="mt-10 border-t border-slate-200 pt-6 text-[10px] text-slate-500 flex justify-between items-end">
            <div className="max-w-md space-y-1">
              <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Customer Terms & Warranty:</p>
              <p>1. Please retain this tax invoice copy for warranty verification and return claims.</p>
              <p>2. Products are eligible for exchange/return within 7 days in accordance with the Durtup Return Policy.</p>
              <p>3. This is a computer-generated commercial invoice and is legally valid without a manual seal.</p>
            </div>
            
            <div className="text-center">
              <div className="inline-block border-2 border-dashed border-slate-300 rounded-lg p-2 px-6 mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DURTUP.SHOP VERIFIED</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Authorized Marketplace Signoff</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
