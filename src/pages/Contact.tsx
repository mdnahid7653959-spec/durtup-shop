import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Mail, Phone, MapPin, MessageCircle, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent! We'll get back to you within 24 hours.");
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="bg-gradient-to-r from-primary to-orange-500 text-white py-16">
          <div className="container text-center">
            <MessageCircle className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
            <p className="text-lg opacity-90">We're here to help 24/7</p>
          </div>
        </div>

        <div className="container py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Info */}
            <div className="space-y-6">
              <div className="p-6 bg-card border rounded-xl">
                <Phone className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-1">Phone</h3>
                <p className="text-muted-foreground">+1 (800) 123-4567</p>
                <p className="text-sm text-muted-foreground mt-1">Mon-Fri 9am-6pm EST</p>
              </div>
              <div className="p-6 bg-card border rounded-xl">
                <Mail className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-1">Email</h3>
                <p className="text-muted-foreground">support@megamart.com</p>
                <p className="text-sm text-muted-foreground mt-1">Response within 24 hours</p>
              </div>
              <div className="p-6 bg-card border rounded-xl">
                <MapPin className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-1">Address</h3>
                <p className="text-muted-foreground">123 Commerce Street<br />New York, NY 10001</p>
              </div>
              <div className="p-6 bg-card border rounded-xl">
                <Clock className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-1">Live Chat</h3>
                <p className="text-muted-foreground">Available 24/7</p>
                <Button size="sm" className="mt-2">Start Chat</Button>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-card border rounded-xl p-6">
                <h2 className="text-xl font-bold mb-6">Send us a message</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Name</label>
                      <Input 
                        value={form.name} 
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Email</label>
                      <Input 
                        type="email" 
                        value={form.email} 
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Subject</label>
                    <Input 
                      value={form.subject} 
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      required 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Message</label>
                    <Textarea 
                      rows={5} 
                      value={form.message} 
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      required 
                    />
                  </div>
                  <Button type="submit" size="lg">
                    <Send className="h-5 w-5 mr-2" /> Send Message
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
