import { Printer, Tag, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PrintableShippingLabelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  courierName?: string;
  trackingNumber?: string;
}

export function PrintableShippingLabelModal({
  open,
  onOpenChange,
  order,
  courierName = "Pathao Courier",
  trackingNumber,
}: PrintableShippingLabelModalProps) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const finalTracking = trackingNumber || order.tracking_number || `DZ-${order.order_number}`;
  const finalCourier = courierName || order.courier_name || "Express Courier";
  const isCOD = (order.payment_method || "").toLowerCase() === "cod" || order.payment_status !== "paid";

  const formatAddr = (addr: any) => {
    if (!addr) return "N/A";
    if (typeof addr === "string") return addr;
    return [
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 border shadow-xl">
        {/* Controls */}
        <div className="flex items-center justify-between p-4 bg-muted border-b print:hidden sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Shipping Label (4x6)</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Shipping Label
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 4x6 Printable Shipping Label */}
        <div className="p-6 bg-white text-slate-900 font-sans print:p-0 print:m-0 flex justify-center">
          <div className="w-[380px] border-4 border-slate-900 p-4 rounded bg-white text-slate-900">
            {/* Courier Banner */}
            <div className="border-b-4 border-slate-900 pb-3 flex justify-between items-center">
              <div>
                <span className="text-2xl font-black tracking-wider uppercase text-slate-900">
                  {finalCourier}
                </span>
                <p className="text-[10px] font-bold text-slate-600">STANDARD DOMESTIC EXPRESS</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold bg-slate-900 text-white px-2 py-1 rounded">
                  HUB-DAC
                </span>
              </div>
            </div>

            {/* Tracking Barcode Simulation */}
            <div className="py-4 border-b-2 border-slate-900 text-center">
              {/* Simulated Barcode Lines */}
              <div className="h-14 bg-slate-900 w-full flex items-center justify-between px-2 gap-1 overflow-hidden my-1">
                {Array.from({ length: 48 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-full ${i % 3 === 0 ? "w-1.5 bg-white" : i % 5 === 0 ? "w-0.5 bg-white" : "w-1 bg-slate-900"}`}
                  />
                ))}
              </div>
              <p className="font-mono text-sm font-black tracking-widest text-slate-900 mt-1">
                {finalTracking}
              </p>
            </div>

            {/* Sender / Return Info */}
            <div className="py-2 border-b text-[10px] text-slate-600 leading-tight">
              <span className="font-bold text-slate-900">SHIP FROM: </span>
              Darzo Logistics Hub, House 42, Road 11, Banani, Dhaka-1213 | Phone: +880 9610-000000
            </div>

            {/* Recipient Deliver To Box */}
            <div className="py-4 border-b-4 border-slate-900">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                SHIP TO (RECIPIENT):
              </span>
              <p className="text-xl font-black text-slate-900 leading-none">
                {order.shipping_address?.name || "RECIPIENT"}
              </p>
              <p className="text-base font-extrabold text-slate-900 mt-1">
                📞 {order.shipping_address?.phone || "NO PHONE"}
              </p>
              <p className="text-sm font-semibold text-slate-800 mt-2 leading-snug">
                {formatAddr(order.shipping_address)}
              </p>
            </div>

            {/* Payment Collection & Package Info */}
            <div className="pt-3 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-500">ORDER NO:</p>
                <p className="text-sm font-black text-slate-900">#{order.order_number}</p>
              </div>

              <div className="text-right">
                {isCOD ? (
                  <div className="border-2 border-slate-900 p-2 rounded bg-slate-100 text-center">
                    <p className="text-[10px] font-extrabold text-slate-700">COLLECT CASH ON DELIVERY</p>
                    <p className="text-xl font-black text-slate-900">৳{order.total?.toLocaleString()}</p>
                  </div>
                ) : (
                  <div className="bg-slate-900 text-white px-4 py-2 rounded text-center">
                    <p className="text-xs font-black tracking-widest">PREPAID - DO NOT COLLECT</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
