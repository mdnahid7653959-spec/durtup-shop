import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Package, Search, Truck, CheckCircle, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState("");
  const [tracking, setTracking] = useState<null | { status: string; steps: { title: string; date: string; done: boolean }[] }>(null);

  const handleTrack = () => {
    // Demo tracking data
    setTracking({
      status: "In Transit",
      steps: [
        { title: "Order Placed", date: "Jan 8, 2026", done: true },
        { title: "Processing", date: "Jan 9, 2026", done: true },
        { title: "Shipped", date: "Jan 10, 2026", done: true },
        { title: "In Transit", date: "Jan 11, 2026", done: true },
        { title: "Out for Delivery", date: "Expected Jan 14", done: false },
        { title: "Delivered", date: "-", done: false },
      ]
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 text-white py-16">
          <div className="container text-center">
            <Package className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">Track Your Order</h1>
            <p className="text-lg opacity-90">Enter your order number to see real-time updates</p>
          </div>
        </div>

        <div className="container py-12">
          <div className="max-w-xl mx-auto">
            <div className="flex gap-2 mb-8">
              <Input 
                placeholder="Enter order number (e.g., MM-123456)" 
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="h-12"
              />
              <Button size="lg" onClick={handleTrack}>
                <Search className="h-5 w-5 mr-2" /> Track
              </Button>
            </div>

            {tracking && (
              <div className="bg-card border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                  <Truck className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Current Status</p>
                    <p className="font-semibold text-lg">{tracking.status}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {tracking.steps.map((step, i) => (
                    <div key={step.title} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.done ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}>
                          {step.done ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                        </div>
                        {i < tracking.steps.length - 1 && (
                          <div className={`w-0.5 h-8 ${step.done ? 'bg-success' : 'bg-muted'}`} />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className={`font-medium ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>{step.title}</p>
                        <p className="text-sm text-muted-foreground">{step.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
