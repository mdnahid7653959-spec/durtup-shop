import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DollarSign, Users, TrendingUp, Gift, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const benefits = [
  { icon: DollarSign, title: "Earn Commissions", desc: "Up to 10% commission on every sale" },
  { icon: Users, title: "Cookie Duration", desc: "30-day cookie for credited referrals" },
  { icon: TrendingUp, title: "Real-time Tracking", desc: "Track your earnings in real-time" },
  { icon: Gift, title: "Bonus Rewards", desc: "Extra bonuses for top performers" },
];

const steps = [
  "Sign up for free",
  "Get your unique affiliate link",
  "Share products with your audience",
  "Earn commissions on every sale",
];

export default function Affiliate() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-20">
          <div className="container text-center">
            <DollarSign className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Affiliate Program</h1>
            <p className="text-xl opacity-90 mb-8">Earn money by promoting products you love</p>
            <Button size="lg" className="bg-white text-emerald-600 hover:bg-white/90">
              Join Now - It's Free
            </Button>
          </div>
        </div>

        {/* Benefits */}
        <div className="container py-12">
          <h2 className="text-2xl font-bold text-center mb-8">Why Join Our Program?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b) => (
              <div key={b.title} className="p-6 bg-card border rounded-xl text-center">
                <b.icon className="h-10 w-10 text-success mx-auto mb-4" />
                <h3 className="font-semibold mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-muted py-12">
          <div className="container">
            <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
            <div className="flex flex-col md:flex-row gap-4 max-w-3xl mx-auto">
              {steps.map((step, i) => (
                <div key={i} className="flex-1 flex items-center gap-3 p-4 bg-card border rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-success text-success-foreground flex items-center justify-center font-bold shrink-0">
                    {i + 1}
                  </div>
                  <span className="font-medium">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sign up */}
        <div className="container py-12">
          <div className="max-w-xl mx-auto bg-card border rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Start Earning?</h2>
            <p className="text-muted-foreground mb-6">Enter your email to get started</p>
            <div className="flex gap-2">
              <Input placeholder="Enter your email" type="email" />
              <Button>Join Now</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">By joining, you agree to our affiliate terms and conditions</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
