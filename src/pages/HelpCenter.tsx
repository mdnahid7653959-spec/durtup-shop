import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HelpCircle, MessageCircle, Phone, Mail, FileQuestion, Package, CreditCard, RotateCcw, Truck, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const helpCategories = [
  { icon: Package, title: "Orders & Shipping", desc: "Track orders, delivery times, shipping methods", href: "/track" },
  { icon: RotateCcw, title: "Returns & Refunds", desc: "Return policy, refund process, exchanges", href: "/returns" },
  { icon: CreditCard, title: "Payment & Billing", desc: "Payment methods, invoices, pricing", href: "#" },
  { icon: FileQuestion, title: "Product Questions", desc: "Size guides, product specs, availability", href: "/products" },
];

const faqs = [
  { q: "How do I track my order?", a: "Go to 'Track Order' page and enter your order number to see real-time updates." },
  { q: "What is the return policy?", a: "We offer 30-day hassle-free returns on most items. See our Returns page for details." },
  { q: "How long does shipping take?", a: "Standard shipping takes 7-15 business days. Express shipping is 3-7 days." },
  { q: "Is my payment secure?", a: "Yes! We use SSL encryption and trusted payment processors for all transactions." },
  { q: "Can I cancel my order?", a: "Orders can be cancelled within 24 hours of placing. Contact support for assistance." },
];

export default function HelpCenter() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <div className="bg-gradient-to-r from-primary to-orange-500 text-white py-16">
          <div className="container text-center">
            <HelpCircle className="h-16 w-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
            <p className="text-lg opacity-90 mb-8">Search our help center or browse categories below</p>
            <div className="max-w-xl mx-auto relative">
              <Input placeholder="Search for help..." className="h-12 pl-12 bg-white text-foreground" />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="container py-12">
          <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {helpCategories.map((cat) => (
              <Link key={cat.title} to={cat.href} className="p-6 bg-card border rounded-xl hover:border-primary transition-colors group">
                <cat.icon className="h-10 w-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-lg mb-2">{cat.title}</h3>
                <p className="text-sm text-muted-foreground">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="container py-12 border-t">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4 max-w-3xl">
            {faqs.map((faq, i) => (
              <div key={i} className="p-4 bg-card border rounded-xl">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-muted-foreground text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-muted py-12">
          <div className="container text-center">
            <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
            <p className="text-muted-foreground mb-6">Our support team is here 24/7</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg">
                <Link to="/contact"><MessageCircle className="mr-2 h-5 w-5" /> Live Chat</Link>
              </Button>
              <Button variant="outline" size="lg">
                <Phone className="mr-2 h-5 w-5" /> +1 (800) 123-4567
              </Button>
              <Button variant="outline" size="lg">
                <Mail className="mr-2 h-5 w-5" /> support@megamart.com
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
