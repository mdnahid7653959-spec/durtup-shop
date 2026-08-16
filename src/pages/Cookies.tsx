import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Cookie, Settings, Shield, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Cookies() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white py-16">
          <div className="container text-center">
            <Cookie className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>
            <p className="opacity-90">How we use cookies to improve your experience</p>
          </div>
        </div>

        <div className="container py-12 max-w-4xl">
          <div className="bg-card border rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Info className="h-5 w-5 text-primary" /> What Are Cookies?</h2>
            <p className="text-muted-foreground">
              Cookies are small text files stored on your device when you visit our website. 
              They help us provide a better experience by remembering your preferences, 
              keeping you signed in, and understanding how you use our site.
            </p>
          </div>

          <div className="bg-card border rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Types of Cookies We Use</h2>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Essential Cookies</h3>
                <p className="text-sm text-muted-foreground">
                  Required for the website to function. They enable core features like shopping cart and checkout.
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Functional Cookies</h3>
                <p className="text-sm text-muted-foreground">
                  Remember your preferences such as language, currency, and recently viewed items.
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Analytics Cookies</h3>
                <p className="text-sm text-muted-foreground">
                  Help us understand how visitors interact with our website to improve the experience.
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Marketing Cookies</h3>
                <p className="text-sm text-muted-foreground">
                  Used to show relevant ads and measure the effectiveness of our marketing campaigns.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Settings className="h-5 w-5 text-primary" /> Managing Cookies</h2>
            <p className="text-muted-foreground mb-4">
              You can control and delete cookies through your browser settings. Note that disabling 
              certain cookies may affect website functionality.
            </p>
            <Button variant="outline">Manage Cookie Preferences</Button>
          </div>

          <div className="bg-card border rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Third-Party Cookies</h2>
            <p className="text-muted-foreground">
              Some cookies are set by third-party services that appear on our pages, such as payment 
              processors and analytics providers. We have no control over these cookies.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
