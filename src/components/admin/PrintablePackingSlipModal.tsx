import { Printer, PackageCheck, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PrintablePackingSlipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  orderItems: any[];
}

export function PrintablePackingSlipModal({
  open,
  onOpenChange,
  order,
  orderItems,
}: PrintablePackingSlipModalProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border shadow-xl">
        {/* Controls Bar */}
        <div className="flex items-center justify-between p-4 bg-muted border-b print:hidden sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Packing Slip Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Packing Slip
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Printable Packing Sheet */}
        <div className="p-8 bg-white text-slate-900 font-sans print:p-0 print:m-0">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">PACKING SLIP</h1>
              <p className="text-xs text-slate-600 font-bold">DURTUP.SHOP FULFILLMENT CENTER</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold text-sm text-slate-900">Order #{order.order_number}</p>
              <p className="text-slate-600">Date: {new Date(order.created_at).toLocaleDateString("en-BD")}</p>
              <p className="text-slate-600">Courier: <span className="font-bold uppercase">{order.courier_name || "Standard Delivery"}</span></p>
              {order.tracking_number && (
                <p className="text-slate-600 font-mono">Tracking: {order.tracking_number}</p>
              )}
            </div>
          </div>

          {/* Delivery Address Box */}
          <div className="my-6 p-4 border-2 border-slate-300 rounded bg-slate-50">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ship To Customer:</h2>
            <p className="text-base font-extrabold text-slate-900">{order.shipping_address?.name || "Recipient"}</p>
            <p className="text-sm font-semibold text-slate-800">Phone: {order.shipping_address?.phone || "N/A"}</p>
            <p className="text-xs text-slate-700 mt-1 whitespace-pre-line">{formatAddr(order.shipping_address)}</p>
          </div>

          {/* Verification Items Checklist */}
          <div className="my-6">
            <h3 className="font-bold text-slate-900 text-sm mb-3 uppercase tracking-wider">
              Package Contents ({orderItems.length} Items)
            </h3>

            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                  <th className="p-2 w-12 text-center border-r border-slate-300">Verify</th>
                  <th className="p-2 border-r border-slate-300">Item Name</th>
                  <th className="p-2 border-r border-slate-300">Variant / SKU</th>
                  <th className="p-2 text-center w-16">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orderItems.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="p-3 text-center border-r border-slate-300">
                      <div className="w-4 h-4 border-2 border-slate-400 rounded mx-auto"></div>
                    </td>
                    <td className="p-3 font-semibold text-slate-900 border-r border-slate-300">
                      {item.product_name}
                    </td>
                    <td className="p-3 text-slate-600 border-r border-slate-300">
                      {item.variant_name || item.sku || "N/A"}
                    </td>
                    <td className="p-3 text-center font-black text-sm text-slate-900">
                      {item.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Special Packing Instructions */}
          {order.notes && (
            <div className="p-3 border border-amber-300 bg-amber-50 rounded text-xs text-amber-900 my-4">
              <span className="font-bold">Packing Note: </span>
              {order.notes}
            </div>
          )}

          {/* Signoff */}
          <div className="mt-12 pt-6 border-t flex justify-between items-end text-xs text-slate-600">
            <div>
              <p>Packed by: ________________________</p>
              <p className="text-[10px] text-slate-400 mt-1">Inspection Timestamp: {new Date().toLocaleString()}</p>
            </div>
            <div>
              <p>Checked by: ________________________</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
