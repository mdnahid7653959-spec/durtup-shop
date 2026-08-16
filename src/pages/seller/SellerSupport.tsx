import { useEffect, useState } from "react";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { supabase } from "@/lib/firebaseAdapter";
import { useAuth } from "@/contexts/AuthContext";
import { SupportChatPanel } from "@/components/support/SupportChatPanel";
import { Loader2, LifeBuoy } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function SellerSupport() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [sellerName, setSellerName] = useState<string>("Seller");

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const { data: seller } = await supabase
        .from("sellers")
        .select("id, shop_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!seller) { setLoading(false); return; }
      setSellerId(seller.id);
      setSellerName(seller.shop_name || "Seller");

      const { data: existing } = await supabase
        .from("seller_support_tickets")
        .select("id")
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setTicketId(existing.id);
      } else {
        const { data: created } = await supabase
          .from("seller_support_tickets")
          .insert({ seller_id: seller.id, subject: "Seller Support" })
          .select("id")
          .single();
        setTicketId(created?.id || null);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <SellerLayout title="Support">
      {loading ? (
        <div className="flex justify-center p-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !sellerId ? (
        <Card className="p-8 text-center">
          <LifeBuoy className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Complete seller registration to access support.</p>
        </Card>
      ) : ticketId ? (
        <div className="h-[calc(100vh-160px)] border rounded-lg overflow-hidden">
          <SupportChatPanel
            ticketId={ticketId}
            senderType="seller"
            senderId={user!.id}
            senderName={sellerName}
            headerTitle="Darzo Support"
            headerSubtitle="We usually reply within a few minutes"
          />
        </div>
      ) : null}
    </SellerLayout>
  );
}
