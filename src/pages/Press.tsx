import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Newspaper, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const pressReleases = [
  { id: 1, date: "Jan 10, 2026", title: "MegaMart Reports Record Q4 2025 Sales", excerpt: "Platform sees 45% increase in global transactions..." },
  { id: 2, date: "Dec 15, 2025", title: "MegaMart Launches Green Shipping Initiative", excerpt: "New eco-friendly packaging reduces carbon footprint by 30%..." },
  { id: 3, date: "Nov 20, 2025", title: "MegaMart Expands to 50 New Countries", excerpt: "Platform now available in 200+ countries worldwide..." },
  { id: 4, date: "Oct 5, 2025", title: "MegaMart Partners with Top Global Brands", excerpt: "New partnerships bring exclusive products to the platform..." },
];

export default function Press() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white py-20">
          <div className="container text-center">
            <Newspaper className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Press Center</h1>
            <p className="text-xl opacity-90">Latest news and media resources</p>
          </div>
        </div>

        <div className="container py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold mb-6">Latest Press Releases</h2>
              <div className="space-y-4">
                {pressReleases.map((pr) => (
                  <div key={pr.id} className="p-6 bg-card border rounded-xl hover:border-primary transition-colors">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="h-4 w-4" /> {pr.date}
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{pr.title}</h3>
                    <p className="text-muted-foreground text-sm mb-3">{pr.excerpt}</p>
                    <Button variant="link" className="p-0 h-auto">
                      Read More <ExternalLink className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-6">Media Contact</h2>
              <div className="bg-card border rounded-xl p-6">
                <p className="text-muted-foreground mb-4">For press inquiries, please contact our media relations team:</p>
                <p className="font-semibold">press@megamart.com</p>
                <p className="text-muted-foreground mt-4">Media Kit</p>
                <Button variant="outline" className="mt-2 w-full">Download Press Kit</Button>
              </div>

              <div className="bg-muted rounded-xl p-6 mt-6">
                <h3 className="font-semibold mb-4">Brand Assets</h3>
                <p className="text-sm text-muted-foreground mb-4">Download official logos, images, and brand guidelines</p>
                <Button variant="outline" size="sm">Download Assets</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
