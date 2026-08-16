import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Copyright, AlertTriangle, FileWarning, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function IntellectualProperty() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-16">
          <div className="container text-center">
            <Copyright className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">Intellectual Property</h1>
            <p className="opacity-90">Protecting rights and reporting infringement</p>
          </div>
        </div>

        <div className="container py-12 max-w-4xl">
          <div className="bg-card border rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Our Commitment</h2>
            <p className="text-muted-foreground">
              MegaMart respects intellectual property rights and expects all users to do the same. 
              We are committed to removing infringing content and taking action against repeat offenders.
            </p>
          </div>

          <div className="bg-card border rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Types of IP We Protect</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Trademarks</h3>
                <p className="text-sm text-muted-foreground">Brand names, logos, and slogans</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Copyrights</h3>
                <p className="text-sm text-muted-foreground">Images, text, videos, and creative works</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Patents</h3>
                <p className="text-sm text-muted-foreground">Inventions and product designs</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Trade Secrets</h3>
                <p className="text-sm text-muted-foreground">Confidential business information</p>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" /> Report Infringement</h2>
            <p className="text-muted-foreground mb-4">
              If you believe your intellectual property rights have been violated, please submit a report with:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>Description of the copyrighted work or trademark</li>
              <li>URL of the infringing content</li>
              <li>Your contact information</li>
              <li>Statement of good faith belief</li>
              <li>Electronic or physical signature</li>
            </ul>
            <Button>Submit IP Report</Button>
          </div>

          <div className="bg-card border rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><FileWarning className="h-5 w-5 text-sale" /> Counter-Notice</h2>
            <p className="text-muted-foreground">
              If you believe your content was wrongly removed, you may submit a counter-notice. 
              We will process your request in accordance with applicable law.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
