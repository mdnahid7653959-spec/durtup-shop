import { useEffect, useState } from "react";
import { supabase } from "@/lib/firebaseAdapter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, MessageSquare, Tag, User, Store } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface SupportTicketRow {
  id: string;
  source_table: "support_tickets" | "seller_support_tickets" | "conversations";
  seller_id?: string | null;
  user_id?: string | null;
  subject: string;
  category?: string;
  status: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  seller_unread_count: number;
  staff_unread_count: number;
  display_name?: string;
  shop_logo?: string;
  ticket_number?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  product_image?: string | null;
}

interface Props {
  perspective: "staff" | "admin";
  selectedId: string | null;
  onSelect: (id: string, sourceTable?: "support_tickets" | "seller_support_tickets" | "conversations") => void;
}

export function SupportTicketList({ perspective, selectedId, onSelect }: Props) {
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      // 1. Fetch seller_support_tickets
      const { data: sellerRows } = await supabase
        .from("seller_support_tickets")
        .select("*")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      const sellerIds = Array.from(new Set((sellerRows || []).map((r) => r.seller_id)));
      let sellersMap = new Map<string, any>();
      if (sellerIds.length) {
        const { data: sellers } = await supabase.from("sellers").select("id, shop_name, shop_logo").in("id", sellerIds);
        sellersMap = new Map((sellers || []).map((s) => [s.id, s]));
      }

      const formattedSellerTickets: SupportTicketRow[] = (sellerRows || []).map((r) => ({
        ...r,
        source_table: "seller_support_tickets",
        display_name: sellersMap.get(r.seller_id)?.shop_name || "Seller Store",
        shop_logo: sellersMap.get(r.seller_id)?.shop_logo,
      }));

      // 2. Fetch customer & seller helpdesk support_tickets
      const { data: supportRows } = await supabase
        .from("support_tickets")
        .select("*")
        .order("updated_at", { ascending: false });

      const supportUserIds = Array.from(new Set((supportRows || []).map((r) => r.user_id).filter(Boolean))) as string[];
      const supportSellerIds = Array.from(new Set((supportRows || []).map((r) => r.seller_id).filter(Boolean))) as string[];

      let profilesMap = new Map<string, any>();
      if (supportUserIds.length) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", supportUserIds);
        profilesMap = new Map((profiles || []).map((p) => [p.id, p]));
      }

      if (supportSellerIds.length) {
        const { data: sellers } = await supabase.from("sellers").select("id, shop_name, shop_logo").in("id", supportSellerIds);
        sellers.forEach((s) => sellersMap.set(s.id, s));
      }

      // Fetch last message preview for each support_ticket
      const supportTicketIds = (supportRows || []).map((t) => t.id);
      let lastMessagesMap = new Map<string, { message: string; created_at: string }>();
      if (supportTicketIds.length > 0) {
        const { data: msgs } = await supabase
          .from("ticket_messages")
          .select("ticket_id, message, created_at")
          .in("ticket_id", supportTicketIds)
          .order("created_at", { ascending: false });

        (msgs || []).forEach((m) => {
          if (!lastMessagesMap.has(m.ticket_id)) {
            lastMessagesMap.set(m.ticket_id, { message: m.message, created_at: m.created_at });
          }
        });
      }

      const formattedSupportTickets: SupportTicketRow[] = (supportRows || []).map((r) => {
        const userProf = r.user_id ? profilesMap.get(r.user_id) : null;
        const sellerObj = r.seller_id ? sellersMap.get(r.seller_id) : null;
        const lastMsg = lastMessagesMap.get(r.id);

        return {
          id: r.id,
          source_table: "support_tickets",
          seller_id: r.seller_id,
          user_id: r.user_id,
          subject: r.subject,
          category: r.category,
          status: r.status || "open",
          ticket_number: r.ticket_number,
          last_message_at: lastMsg?.created_at || r.updated_at || r.created_at,
          last_message_preview: lastMsg?.message || r.subject,
          seller_unread_count: 0,
          staff_unread_count: 0,
          display_name: userProf?.full_name || sellerObj?.shop_name || "Helpdesk Ticket",
          shop_logo: sellerObj?.shop_logo,
        };
      });

      // 3. Fetch buyer conversations (Live store chats & product inquiries)
      const { data: convRows } = await supabase
        .from("conversations")
        .select("*")
        .order("last_message_at", { ascending: false, nullsFirst: false });

      const convBuyerIds = Array.from(new Set((convRows || []).map((r: any) => r.buyer_id).filter(Boolean)));
      if (convBuyerIds.length) {
        const { data: buyerProfs } = await supabase.from("profiles").select("id, full_name, email").in("id", convBuyerIds);
        (buyerProfs || []).forEach((p: any) => profilesMap.set(p.id, p));
      }

      // Fetch last messages for conversations
      const convIds = (convRows || []).map((c: any) => c.id);
      let convLastMsgsMap = new Map<string, { content: string; created_at: string }>();
      if (convIds.length > 0) {
        const { data: convMsgs } = await supabase
          .from("messages")
          .select("conversation_id, content, created_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false });

        (convMsgs || []).forEach((m: any) => {
          if (!convLastMsgsMap.has(m.conversation_id)) {
            convLastMsgsMap.set(m.conversation_id, { content: m.content, created_at: m.created_at });
          }
        });
      }

      const formattedConvs: SupportTicketRow[] = (convRows || []).map((r: any) => {
        const buyerProf = profilesMap.get(r.buyer_id);
        const lastMsg = convLastMsgsMap.get(r.id);
        const buyerName = buyerProf?.full_name || buyerProf?.email || "Customer";

        return {
          id: r.id,
          source_table: "conversations",
          user_id: r.buyer_id,
          seller_id: r.seller_id,
          subject: r.product_id ? `Product Chat (${r.product_id})` : `Chat with ${buyerName}`,
          category: r.product_id ? "Product Inquiry" : "Store Chat",
          status: "open",
          ticket_number: r.id.slice(0, 12),
          last_message_at: lastMsg?.created_at || r.last_message_at || r.created_at,
          last_message_preview: lastMsg?.content || r.last_message || "Product Inquiry Chat",
          seller_unread_count: r.seller_unread_count || 0,
          staff_unread_count: r.seller_unread_count || 0,
          display_name: buyerName,
          product_id: r.product_id,
        };
      });

      // Combine and sort by last_message_at desc
      const combined = [...formattedConvs, ...formattedSupportTickets, ...formattedSellerTickets].sort((a, b) => {
        const timeA = new Date(a.last_message_at || 0).getTime();
        const timeB = new Date(b.last_message_at || 0).getTime();
        return timeB - timeA;
      });

      setTickets(combined);
    } catch (err) {
      console.error("Error loading tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const ch1 = supabase
      .channel("support-tickets-list-seller")
      .on("postgres_changes", { event: "*", schema: "public", table: "seller_support_tickets" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "seller_support_messages" }, () => load())
      .subscribe();

    const ch2 = supabase
      .channel("support-tickets-list-helpdesk")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_messages" }, () => load())
      .subscribe();

    const ch3 = supabase
      .channel("support-tickets-list-convs")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
    };
  }, []);

  const filtered = tickets.filter(
    (t) =>
      !q ||
      (t.display_name || "").toLowerCase().includes(q.toLowerCase()) ||
      (t.subject || "").toLowerCase().includes(q.toLowerCase()) ||
      (t.last_message_preview || "").toLowerCase().includes(q.toLowerCase()) ||
      (t.ticket_number || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-2">
        <h2 className="font-semibold text-sm flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4 text-primary" />
          Support Helpdesk & Tickets
        </h2>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tickets, names…" className="pl-8 h-9 text-xs" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No support tickets found</p>
          </div>
        ) : (
          filtered.map((t) => {
            const unread = perspective === "staff" ? t.staff_unread_count : 0;
            const isHelpdesk = t.source_table === "support_tickets";

            return (
              <button
                key={t.id}
                onClick={() => onSelect(t.id, t.source_table)}
                className={cn("w-full p-3 text-left border-b hover:bg-muted/50 transition", selectedId === t.id && "bg-muted")}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                    {t.shop_logo ? (
                      <img src={t.shop_logo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {(t.display_name || "S")[0].toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-medium text-xs truncate text-foreground">{t.display_name}</p>
                      {unread > 0 && <Badge className="h-4 min-w-[18px] text-[10px]">{unread}</Badge>}
                    </div>

                    <div className="flex items-center gap-1 my-0.5">
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-mono">
                        {isHelpdesk ? (t.ticket_number || "HELPDESK") : "DIRECT"}
                      </Badge>
                      {t.category && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 capitalize truncate max-w-[80px]">
                          {t.category}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground truncate">{t.last_message_preview || t.subject || "No messages yet"}</p>
                    {t.last_message_at && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(t.last_message_at), "dd MMM, h:mm a")}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </ScrollArea>
    </div>
  );
}
