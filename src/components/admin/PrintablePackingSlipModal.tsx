import { Printer, PackageCheck, X, CheckSquare, Barcode, Truck } from "lucide-react";
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

  const formattedDate = new Date(order.created_at || Date.now()).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 border shadow-2xl bg-slate-900 text-slate-100">
        {/* Controls Bar (Hidden on print) */}
        <div className="flex items-center justify-between p-4 bg-slate-800/90 border-b border-slate-700 print:hidden sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-orange-500" />
            <span className="font-semibold text-white">Packing Slip Preview</span>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="default" 
              size="sm" 
              onClick={handlePrint}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-md gap-1.5"
            >
              <Printer className="h-4 w-4" />
              Print Packing Slip
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

        {/* Printable Packing Sheet (Ultra-clean, high contrast warehouse slip) */}
        <div className="p-8 sm:p-10 bg-white text-slate-900 font-sans print:p-0 print:m-0">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <img
                  src="/durtup-logo.png"
                  alt="Durtup.shop"
                  className="h-8 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <span className="text-xl font-black text-slate-900">
                  DURTUP<span className="text-orange-500">.SHOP</span>
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">PACKING SLIP & MANIFEST</h1>
              <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                DURTUP.SHOP CENTRAL FULFILLMENT HUB
              </p>
            </div>

            <div className="text-right text-xs space-y-1">
              <div className="inline-block bg-slate-900 text-white px-3 py-1 font-mono font-black text-sm rounded">
                ORDER #{order.order_number}
              </div>
              <p className="text-slate-600 font-medium">Date: <span className="font-bold text-slate-800">{formattedDate}</span></p>
              <p className="text-slate-600 font-medium">
                Courier: <span className="font-black text-slate-900 uppercase">{order.courier_name || "Standard Delivery"}</span>
              </p>
              {order.tracking_number && (
                <p className="text-slate-700 font-mono text-[11px] font-bold">
                  Tracking: {order.tracking_number}
                </p>
              )}
            </div>
          </div>

          {/* Delivery Address & Customer Target */}
          <div className="my-5 p-4 border-2 border-slate-900 rounded-xl bg-slate-50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-orange-500" />
                Deliver To Customer:
              </span>
              <span className="text-xs font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded uppercase">
                {order.payment_method || "COD"}
              </span>
            </div>
            <p className="text-lg font-black text-slate-900">{order.shipping_address?.name || "Recipient"}</p>
            <p className="text-sm font-extrabold text-slate-800 mt-0.5">
              Phone: {order.shipping_address?.phone || "N/A"}
            </p>
            <p className="text-xs text-slate-700 mt-1 font-medium whitespace-pre-line leading-relaxed">
              {formatAddr(order.shipping_address)}
            </p>
          </div>

          {/* Verification Items Checklist */}
          <div className="my-5">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">
                Package Contents ({orderItems.length} {orderItems.length === 1 ? "Item" : "Items"})
              </h3>
              <span className="text-[11px] font-bold text-slate-500 uppercase">QC Inspection Status</span>
            </div>

            <table className="w-full text-left text-xs border-collapse border border-slate-300 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="p-2.5 w-12 text-center border-r border-slate-700">Check</th>
                  <th className="p-2.5 border-r border-slate-700">Item Description</th>
                  <th className="p-2.5 border-r border-slate-700">Variant / SKU</th>
                  <th className="p-2.5 text-center w-16">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {orderItems.map((item, idx) => (
                  <tr key={item.id || idx} className={idx % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                    <td className="p-3 text-center border-r border-slate-300">
                      <div className="w-5 h-5 border-2 border-slate-600 rounded flex items-center justify-center mx-auto" />
                    </td>
                    <td className="p-3 font-bold text-slate-900 border-r border-slate-300">
                      {item.product_name}
                      {item.product_id && (
                        <p className="text-[10px] font-mono text-slate-400 font-normal">ID: {item.product_id}</p>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 font-medium border-r border-slate-300">
                      {item.variant_name || item.sku || "Standard / Default"}
                    </td>
                    <td className="p-3 text-center font-black text-base text-slate-900">
                      {item.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Packing & Transaction Instructions */}
          {order.notes && (
            <div className="p-3.5 border-2 border-dashed border-amber-300 bg-amber-50/80 rounded-xl text-xs text-amber-900 my-4">
              <span className="font-extrabold uppercase text-[11px] text-amber-800 block mb-0.5">Packing Note / Instructions:</span>
              <p className="font-semibold">{order.notes}</p>
            </div>
          )}

          {/* Warehouse Quality Signoff */}
          <div className="mt-8 pt-5 border-t-2 border-slate-200 flex justify-between items-end text-xs text-slate-600">
            <div className="space-y-1">
              <p className="font-bold text-slate-800">Packed by: ________________________</p>
              <p className="text-[10px] text-slate-400">Timestamp: {new Date().toLocaleString()}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="font-bold text-slate-800">QC Verified by: ________________________</p>
              <p className="text-[10px] text-slate-400">Durtup Fulfillment Assurance</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
