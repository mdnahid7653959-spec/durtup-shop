import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Truck, Plane, Ship, Clock, MapPin, Package } from "lucide-react";

const shippingMethods = [
  { icon: Ship, name: "Standard Shipping", time: "7-15 business days", price: "Free over $25", color: "text-blue-500" },
  { icon: Truck, name: "Express Shipping", time: "3-7 business days", price: "$9.99", color: "text-green-500" },
  { icon: Plane, name: "Priority Shipping", time: "1-3 business days", price: "$19.99", color: "text-orange-500" },
];

const zones = [
  { region: "North America", standard: "5-10 days", express: "2-5 days" },
  { region: "Europe", standard: "7-14 days", express: "3-7 days" },
  { region: "Asia Pacific", standard: "10-20 days", express: "5-10 days" },
  { region: "Rest of World", standard: "15-25 days", express: "7-14 days" },
];

export default function Shipping() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-16">
          <div className="container text-center">
            <Truck className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">Shipping Information</h1>
            <p className="text-lg opacity-90">Fast, reliable delivery worldwide</p>
          </div>
        </div>

        <div className="container py-12">
          <h2 className="text-2xl font-bold mb-6">Shipping Methods</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {shippingMethods.map((method) => (
              <div key={method.name} className="p-6 bg-card border rounded-xl">
                <method.icon className={`h-12 w-12 ${method.color} mb-4`} />
                <h3 className="font-semibold text-lg mb-2">{method.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Clock className="h-4 w-4" /> {method.time}
                </div>
                <p className="font-semibold text-primary">{method.price}</p>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-bold mb-6">Delivery Times by Region</h2>
          <div className="bg-card border rounded-xl overflow-hidden mb-12">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Region</th>
                  <th className="px-6 py-4 text-left font-semibold">Standard</th>
                  <th className="px-6 py-4 text-left font-semibold">Express</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.region} className="border-t">
                    <td className="px-6 py-4 flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {zone.region}</td>
                    <td className="px-6 py-4 text-muted-foreground">{zone.standard}</td>
                    <td className="px-6 py-4 text-muted-foreground">{zone.express}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-muted rounded-xl p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" /> Free Shipping
            </h3>
            <p className="text-muted-foreground">
              Enjoy FREE standard shipping on all orders over $25! No promo code needed - discount applies automatically at checkout.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
