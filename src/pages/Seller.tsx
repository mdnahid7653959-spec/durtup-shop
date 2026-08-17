import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/firebaseAdapter";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Store, TrendingUp, Globe, Package, Shield, Headphones, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  { icon: Globe, title: "Global Reach", desc: "Sell to 50M+ customers in 200+ countries" },
  { icon: TrendingUp, title: "Growth Tools", desc: "Analytics and marketing tools to boost sales" },
  { icon: Package, title: "Easy Fulfillment", desc: "Flexible shipping and logistics solutions" },
  { icon: Shield, title: "Seller Protection", desc: "Secure payments and fraud prevention" },
  { icon: Headphones, title: "24/7 Support", desc: "Dedicated seller support team" },
];

const steps = [
  { step: 1, title: "Create Account", desc: "Sign up for a free seller account" },
  { step: 2, title: "List Products", desc: "Add your products with photos and details" },
  { step: 3, title: "Start Selling", desc: "Reach millions of buyers worldwide" },
];

export default function Seller() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSellerStatus = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        const { data: seller } = await supabase
          .from("sellers")
          .select("status")
          .eq("user_id", user.id)
          .single();

        if (seller) {
          if (seller.status === "approved") {
            navigate("/seller/dashboard", { replace: true });
            return;
          } else if (seller.status === "pending") {
            navigate("/seller/pending", { replace: true });
            return;
          }
        }
      } catch {
        // No seller record found - show marketing page
      }
      setChecking(false);
    };

    checkSellerStatus();
  }, [user, navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pb-24 md:pb-0">
        <div className="bg-gradient-to-r from-primary to-orange-500 text-white py-10 sm:py-16 md:py-20">
          <div className="container px-4">
            <div className="max-w-2xl">
              <Store className="h-10 w-10 sm:h-14 sm:w-14 md:h-16 md:w-16 mb-3 sm:mb-4" />
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-4 leading-tight">Sell on MegaMart</h1>
              <p className="text-sm sm:text-lg md:text-xl opacity-90 mb-5 sm:mb-8 leading-relaxed">Join 100,000+ sellers and reach millions of customers worldwide</p>
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4">
                <Button size="lg" className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 h-11 sm:h-11" asChild>
                  <Link to={user ? "/seller/register" : "/register"}>
                    Start Selling Today
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white/10 h-11 sm:h-11">
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="container -mt-6 sm:-mt-10 relative z-10 px-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-card border rounded-xl p-3 sm:p-6 text-center shadow-lg">
              <p className="text-lg sm:text-3xl font-bold text-primary">50M+</p>
              <p className="text-[11px] sm:text-base text-muted-foreground leading-tight">Active Buyers</p>
            </div>
            <div className="bg-card border rounded-xl p-3 sm:p-6 text-center shadow-lg">
              <p className="text-lg sm:text-3xl font-bold text-primary">200+</p>
              <p className="text-[11px] sm:text-base text-muted-foreground leading-tight">Countries</p>
            </div>
            <div className="bg-card border rounded-xl p-3 sm:p-6 text-center shadow-lg">
              <p className="text-lg sm:text-3xl font-bold text-primary">$0</p>
              <p className="text-[11px] sm:text-base text-muted-foreground leading-tight">Setup Fee</p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="container py-10 sm:py-16 px-4">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8">Why Sell on MegaMart?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {benefits.map((b) => (
              <div key={b.title} className="p-4 sm:p-6 bg-card border rounded-xl">
                <b.icon className="h-8 w-8 sm:h-10 sm:w-10 text-primary mb-3 sm:mb-4" />
                <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2">{b.title}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How to start */}
        <div className="bg-muted py-10 sm:py-16">
          <div className="container px-4">
            <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8">Get Started in 3 Easy Steps</h2>
            <div className="flex flex-col md:flex-row gap-3 sm:gap-6 max-w-4xl mx-auto">
              {steps.map((s) => (
                <div key={s.step} className="flex-1 p-4 sm:p-6 bg-card border rounded-xl text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-3 sm:mb-4 text-lg sm:text-xl font-bold">
                    {s.step}
                  </div>
                  <h3 className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">{s.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="container py-10 sm:py-16 text-center px-4">
          <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4">Ready to grow your business?</h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-5 sm:mb-6">Join thousands of successful sellers on MegaMart</p>
          <Button size="lg" className="w-full sm:w-auto h-11" asChild>
            <Link to={user ? "/seller/register" : "/register"}>
              Create Seller Account <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
