import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { RotateCcw, Package, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  { step: 1, title: "Request Return", desc: "Submit a return request within 30 days of delivery" },
  { step: 2, title: "Ship Item Back", desc: "Pack the item and ship it using the prepaid label" },
  { step: 3, title: "Get Refund", desc: "Receive your refund within 5-7 business days" },
];

const policies = [
  { icon: CheckCircle, title: "30-Day Returns", desc: "Return most items within 30 days of delivery for a full refund" },
  { icon: Package, title: "Free Return Shipping", desc: "We provide prepaid shipping labels for all eligible returns" },
  { icon: Clock, title: "Fast Refunds", desc: "Refunds processed within 5-7 business days after we receive the item" },
];

export default function Returns() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-16">
          <div className="container text-center">
            <RotateCcw className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">Returns & Refunds</h1>
            <p className="text-lg opacity-90">Easy, hassle-free returns within 30 days</p>
          </div>
        </div>

        <div className="container py-12">
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {policies.map((policy) => (
              <div key={policy.title} className="p-6 bg-card border rounded-xl text-center">
                <policy.icon className="h-12 w-12 text-success mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">{policy.title}</h3>
                <p className="text-sm text-muted-foreground">{policy.desc}</p>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-bold mb-6">How to Return an Item</h2>
          <div className="flex flex-col md:flex-row gap-4 mb-12">
            {steps.map((s) => (
              <div key={s.step} className="flex-1 p-6 bg-muted rounded-xl text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {s.step}
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-card border rounded-xl p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" /> Non-Returnable Items
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Personalized or custom-made items</li>
              <li>Perishable goods (food, flowers, etc.)</li>
              <li>Digital downloads and gift cards</li>
              <li>Intimate or sanitary goods</li>
              <li>Items marked as final sale</li>
            </ul>
          </div>

          <div className="mt-8 text-center">
            <Button size="lg">Start a Return</Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
