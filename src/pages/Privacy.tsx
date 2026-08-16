import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Shield, Eye, Lock, Database, UserCheck, Mail } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white py-16">
          <div className="container text-center">
            <Shield className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="opacity-90">Last updated: January 1, 2026</p>
          </div>
        </div>

        <div className="container py-12 max-w-4xl">
          <div className="prose prose-slate max-w-none">
            <div className="bg-card border rounded-xl p-6 mb-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Eye className="h-5 w-5 text-primary" /> Information We Collect</h2>
              <p className="text-muted-foreground mb-4">We collect information you provide directly to us, such as:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Account information (name, email, password)</li>
                <li>Payment information (processed securely through third-party providers)</li>
                <li>Shipping and billing addresses</li>
                <li>Communication preferences</li>
                <li>Purchase history and browsing behavior</li>
              </ul>
            </div>

            <div className="bg-card border rounded-xl p-6 mb-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> How We Use Your Information</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Process and fulfill your orders</li>
                <li>Send order confirmations and shipping updates</li>
                <li>Provide customer support</li>
                <li>Personalize your shopping experience</li>
                <li>Send promotional communications (with your consent)</li>
                <li>Improve our services and detect fraud</li>
              </ul>
            </div>

            <div className="bg-card border rounded-xl p-6 mb-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> Data Security</h2>
              <p className="text-muted-foreground">
                We implement industry-standard security measures to protect your personal information. 
                All payment data is encrypted and processed through secure, PCI-compliant payment processors. 
                We never store your full credit card information on our servers.
              </p>
            </div>

            <div className="bg-card border rounded-xl p-6 mb-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary" /> Your Rights</h2>
              <p className="text-muted-foreground mb-4">You have the right to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate information</li>
                <li>Delete your account and data</li>
                <li>Opt out of marketing communications</li>
                <li>Export your data</li>
              </ul>
            </div>

            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy, please contact us at: privacy@megamart.com
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
