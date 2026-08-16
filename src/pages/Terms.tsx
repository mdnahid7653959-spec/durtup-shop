import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FileText, CheckCircle, AlertCircle, Scale } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white py-16">
          <div className="container text-center">
            <FileText className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
            <p className="opacity-90">Last updated: January 1, 2026</p>
          </div>
        </div>

        <div className="container py-12 max-w-4xl">
          <div className="bg-card border rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using MegaMart, you accept and agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our services.
            </p>
          </div>

          <div className="bg-card border rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">2. Account Registration</h2>
            <p className="text-muted-foreground mb-4">To use certain features, you must create an account. You agree to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized use</li>
              <li>Be responsible for all activities under your account</li>
            </ul>
          </div>

          <div className="bg-card border rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">3. Purchases and Payments</h2>
            <p className="text-muted-foreground mb-4">When making a purchase:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Prices are displayed in your selected currency</li>
              <li>Payment is due at the time of purchase</li>
              <li>We accept major credit cards and PayPal</li>
              <li>All sales are subject to product availability</li>
            </ul>
          </div>

          <div className="bg-card border rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">4. Shipping and Delivery</h2>
            <p className="text-muted-foreground">
              Delivery times are estimates and may vary. We are not responsible for delays caused by 
              shipping carriers, customs, or events beyond our control. Risk of loss passes to you upon delivery.
            </p>
          </div>

          <div className="bg-card border rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">5. Returns and Refunds</h2>
            <p className="text-muted-foreground">
              Our return policy allows returns within 30 days of delivery for most items. 
              Please see our Returns page for full details and exclusions.
            </p>
          </div>

          <div className="bg-card border rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><AlertCircle className="h-5 w-5 text-warning" /> 6. Prohibited Activities</h2>
            <p className="text-muted-foreground mb-4">You may not:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Use the service for any illegal purpose</li>
              <li>Violate intellectual property rights</li>
              <li>Attempt to gain unauthorized access</li>
              <li>Engage in fraudulent activities</li>
              <li>Harass other users or sellers</li>
            </ul>
          </div>

          <div className="bg-card border rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Scale className="h-5 w-5 text-primary" /> 7. Governing Law</h2>
            <p className="text-muted-foreground">
              These terms are governed by the laws of the State of New York. Any disputes shall be 
              resolved in the courts of New York, NY.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
