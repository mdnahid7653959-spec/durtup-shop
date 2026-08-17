import { Printer, Download, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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

  const formattedDate = new Date(order.created_at).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 border shadow-xl">
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="flex items-center justify-between p-4 bg-muted border-b print:hidden sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Printable Invoice Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print / Save PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="p-8 bg-white text-slate-900 font-sans print:p-0 print:m-0 id='printable-invoice-content'">
          {/* Invoice Header */}
          <div className="flex justify-between items-start border-b pb-6">
            <div>
              <img
                src="/darzo-logo.png"
                alt="Darzo Logo"
                className="h-10 w-auto object-contain mb-2"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">DARZO E-COMMERCE</h1>
              <p className="text-xs text-slate-500">Banani C/A, Dhaka-1213, Bangladesh</p>
              <p className="text-xs text-slate-500">BIN: 004829104-0102 | Support: support@darzo.com</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded mb-2">
                INVOICE
              </span>
              <p className="text-sm font-semibold text-slate-800">#INV-{order.order_number}</p>
              <p className="text-xs text-slate-500">Date: {formattedDate}</p>
              <p className="text-xs text-slate-500 capitalize">Payment Status: <span className="font-semibold">{order.payment_status}</span></p>
              <p className="text-xs text-slate-500 capitalize">Method: {order.payment_method || "COD"}</p>
            </div>
          </div>

          {/* Billing & Shipping Columns */}
          <div className="grid grid-cols-2 gap-8 my-6 text-xs">
            <div className="p-4 bg-slate-50 rounded border border-slate-200">
              <h3 className="font-bold text-slate-800 uppercase text-[11px] mb-2 tracking-wider">Billed To</h3>
              <p className="font-semibold text-slate-900 text-sm">
                {customerInfo?.full_name || order.shipping_address?.name || "Valued Customer"}
              </p>
              <p className="text-slate-600">{customerInfo?.email || "N/A"}</p>
              <p className="text-slate-600">{customerInfo?.phone || order.shipping_address?.phone || "N/A"}</p>
              <p className="text-slate-600 mt-1">{formatAddr(order.billing_address || order.shipping_address)}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded border border-slate-200">
              <h3 className="font-bold text-slate-800 uppercase text-[11px] mb-2 tracking-wider">Shipped To</h3>
              <p className="font-semibold text-slate-900 text-sm">
                {order.shipping_address?.name || customerInfo?.full_name || "Recipient"}
              </p>
              <p className="text-slate-600">{order.shipping_address?.phone || customerInfo?.phone || "N/A"}</p>
              <p className="text-slate-600 mt-1">{formatAddr(order.shipping_address)}</p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-left text-xs border-collapse my-6">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
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
                <tr key={item.id || idx} className="hover:bg-slate-50">
                  <td className="p-3 text-center text-slate-500">{idx + 1}</td>
                  <td className="p-3 font-medium text-slate-800">{item.product_name}</td>
                  <td className="p-3 text-slate-500">{item.variant_name || item.sku || "Standard"}</td>
                  <td className="p-3 text-center font-semibold text-slate-700">{item.quantity}</td>
                  <td className="p-3 text-right text-slate-700">৳{(item.price || 0).toLocaleString()}</td>
                  <td className="p-3 text-right font-bold text-slate-900">৳{(item.total || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary Box */}
          <div className="flex justify-end my-6">
            <div className="w-64 space-y-2 text-xs border-t pt-4">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>৳{(order.subtotal || 0).toLocaleString()}</span>
              </div>
              {(order.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-৳{order.discount_amount.toLocaleString()}</span>
                </div>
              )}
              {(order.tax_amount || 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax:</span>
                  <span>৳{order.tax_amount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Shipping Fee:</span>
                <span>৳{(order.shipping_cost || 0).toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-slate-900 font-bold text-base pt-1">
                <span>Grand Total:</span>
                <span>৳{(order.total || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer & Terms */}
          <div className="mt-12 border-t pt-6 text-[10px] text-slate-500 flex justify-between items-end">
            <div>
              <p className="font-semibold text-slate-700">Terms & Conditions:</p>
              <p>1. Please keep this invoice for warranty and return claims.</p>
              <p>2. Returns are accepted within 7 days according to store return policy.</p>
              <p>3. This is a computer-generated tax invoice and does not require a physical signature.</p>
            </div>
            <div className="text-center w-36 border-t border-slate-400 pt-1 text-slate-600">
              Authorized Signature
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
