import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Building2, Users, Globe, Award, Target, Heart } from "lucide-react";

const stats = [
  { label: "Products", value: "10M+" },
  { label: "Customers", value: "50M+" },
  { label: "Countries", value: "200+" },
  { label: "Sellers", value: "100K+" },
];

const values = [
  { icon: Target, title: "Customer First", desc: "Every decision we make starts with our customers in mind" },
  { icon: Award, title: "Quality Assured", desc: "We partner only with trusted sellers and brands" },
  { icon: Heart, title: "Community Driven", desc: "Building a global community of shoppers and sellers" },
];

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="bg-gradient-to-r from-primary to-orange-500 text-white py-20">
          <div className="container text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">About MegaMart</h1>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">Connecting millions of buyers and sellers around the world</p>
          </div>
        </div>

        {/* Stats */}
        <div className="container -mt-10 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-card border rounded-xl p-6 text-center shadow-lg">
                <p className="text-3xl font-bold text-primary">{stat.value}</p>
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Story */}
        <div className="container py-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Story</h2>
              <p className="text-muted-foreground mb-4">
                Founded in 2020, MegaMart started with a simple mission: make global shopping accessible to everyone. 
                We believed that great products shouldn't be limited by borders.
              </p>
              <p className="text-muted-foreground mb-4">
                Today, we're one of the world's largest online marketplaces, connecting millions of buyers with 
                hundreds of thousands of sellers across 200+ countries.
              </p>
              <p className="text-muted-foreground">
                Our platform offers everything from electronics and fashion to home goods and beyond, 
                all at competitive prices with reliable shipping worldwide.
              </p>
            </div>
            <div className="bg-gradient-to-br from-primary/20 to-orange-500/20 rounded-2xl p-8 flex items-center justify-center">
              <Building2 className="h-40 w-40 text-primary/50" />
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="bg-muted py-16">
          <div className="container">
            <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {values.map((value) => (
                <div key={value.title} className="bg-card border rounded-xl p-6 text-center">
                  <value.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                  <p className="text-muted-foreground text-sm">{value.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Global */}
        <div className="container py-16 text-center">
          <Globe className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Truly Global</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            With operations in over 200 countries and support for 50+ currencies, 
            MegaMart makes it easy to shop from anywhere in the world.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
