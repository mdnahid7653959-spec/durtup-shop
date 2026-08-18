import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/firebaseAdapter";
import { adminDb } from "@/lib/adminDb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Paperclip, Send, Mic, Square, Loader2, MessageSquare, FileText, Image as ImageIcon, ArrowLeft, ExternalLink, Package, Store } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getCachedMohasagorProducts } from "@/utils/mohasagorCache";

export interface SupportAttachment {
  url: string;
  path: string;
  type: string; // mime
  kind: "image" | "audio" | "file";
  name: string;
  size: number;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: "seller" | "staff" | "admin" | "customer" | string;
  sender_id: string;
  sender_name: string | null;
  content: string | null;
  attachments: SupportAttachment[];
  created_at: string;
  read_at: string | null;
}

interface Props {
  ticketId: string;
  sourceTable?: "support_tickets" | "seller_support_tickets" | "conversations";
  senderType: "seller" | "staff" | "admin";
  senderId: string;
  senderName: string;
  readOnly?: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
  onBack?: () => void;
}

async function uploadFile(file: File, ticketId: string): Promise<SupportAttachment> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${ticketId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("seller-support").upload(path, file, {
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  const { data: signed } = await supabase.storage.from("seller-support").createSignedUrl(path, 60 * 60 * 24 * 365);
  const kind: SupportAttachment["kind"] = file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("audio/")
    ? "audio"
    : "file";
  return { url: signed?.signedUrl || "", path, type: file.type, kind, name: file.name, size: file.size };
}

function AttachmentView({ att }: { att: SupportAttachment }) {
  if (att.kind === "image") {
    return (
      <a href={att.url} target="_blank" rel="noreferrer" className="block">
        <img src={att.url} alt={att.name} className="max-h-56 rounded-lg object-cover" />
      </a>
    );
  }
  if (att.kind === "audio") {
    return <audio controls src={att.url} className="max-w-full" />;
  }
  return (
    <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md border p-2 bg-background/50 hover:bg-muted transition">
      <FileText className="h-4 w-4 shrink-0" />
      <span className="text-xs truncate">{att.name}</span>
    </a>
  );
}

export function SupportChatPanel({ ticketId, sourceTable, senderType, senderId, senderName, readOnly, headerTitle, headerSubtitle, onBack }: Props) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const isDirectConv = sourceTable === "conversations" || ticketId.startsWith("conv-");
  const [ticketSource, setTicketSource] = useState<"support_tickets" | "seller_support_tickets" | "conversations">(
    isDirectConv ? "conversations" : (sourceTable || "seller_support_tickets")
  );
  const [convDetails, setConvDetails] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const fetchChatMessages = async (isCancel: () => boolean) => {
    // 1. Check if ticketId is a conversation (buyer-seller product/store chat)
    if (isDirectConv || ticketSource === "conversations") {
      setTicketSource("conversations");

      // Fetch buyer profile & product details
      const { data: convRow } = await supabase.from("conversations").select("*").eq("id", ticketId).maybeSingle();
      
      let buyerProf: any = null;
      let productInfo: any = null;

      if (convRow) {
        if (convRow.buyer_id) {
          const { data: bp } = await supabase.from("profiles").select("full_name, email, phone").eq("id", convRow.buyer_id).maybeSingle();
          buyerProf = bp;
        }

        if (convRow.product_id) {
          const catalog = await getCachedMohasagorProducts().catch(() => []);
          productInfo = catalog.find((p: any) => p.id === convRow.product_id || p.slug === convRow.product_id);
          if (!productInfo) {
            const { data: dbProd } = await supabase.from("products").select("id, name, slug, image, discount_price, regular_price").eq("id", convRow.product_id).maybeSingle();
            productInfo = dbProd;
          }
        }

        if (!isCancel()) {
          setConvDetails({
            ...convRow,
            buyer_name: buyerProf?.full_name || buyerProf?.email || "Customer",
            buyer_email: buyerProf?.email,
            product_name: productInfo?.name,
            product_image: productInfo?.image,
            product_price: productInfo?.discount_price || productInfo?.regular_price || productInfo?.price,
            product_slug: productInfo?.slug,
          });
        }
      }

      // Fetch messages from "messages" table
      const { data: msgRows } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", ticketId)
        .order("created_at", { ascending: true });

      const formatted: SupportMessage[] = (msgRows || []).map((m: any) => ({
        id: m.id,
        ticket_id: m.conversation_id,
        sender_type: m.sender_type === "buyer" ? "customer" : (m.sender_type || "seller"),
        sender_id: m.sender_id || "",
        sender_name: m.sender_type === "buyer" ? (buyerProf?.full_name || "Customer") : (senderName || "Admin"),
        content: m.content,
        attachments: [],
        created_at: m.created_at,
        read_at: m.created_at,
      }));

      // Also check seller_support_messages for any legacy or merged messages
      try {
        const { data: ssmRows } = await supabase
          .from("seller_support_messages")
          .select("*")
          .eq("ticket_id", ticketId);

        if (ssmRows && ssmRows.length > 0) {
          ssmRows.forEach((sm: any) => {
            if (!formatted.some(m => m.id === sm.id || (m.content === (sm.content || sm.message) && Math.abs(new Date(m.created_at).getTime() - new Date(sm.created_at).getTime()) < 5000))) {
              formatted.push({
                id: sm.id,
                ticket_id: ticketId,
                sender_type: sm.sender_type || "admin",
                sender_id: sm.sender_id || "",
                sender_name: sm.sender_name || (sm.sender_type === "seller" ? "Seller" : "Admin"),
                content: sm.content || sm.message || "",
                attachments: sm.attachments || [],
                created_at: sm.created_at,
                read_at: sm.created_at,
              });
            }
          });
          formatted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
      } catch {}

      if (!isCancel()) {
        setMessages(formatted);
        setLoading(false);

        // Mark unread as 0 for seller/admin
        supabase.from("conversations").update({ seller_unread_count: 0 }).eq("id", ticketId).then();
        supabase.from("messages").update({ is_read: true }).eq("conversation_id", ticketId).eq("sender_type", "buyer").eq("is_read", false).then();
      }
      return;
    }

    // 2. Check if ticketId exists in support_tickets table
    const { data: stRow } = await supabase.from("support_tickets").select("id, subject").eq("id", ticketId).maybeSingle();

    if (stRow) {
      setTicketSource("support_tickets");
      const { data: tmRows } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (!isCancel()) {
        const formatted: SupportMessage[] = (tmRows || []).map((m) => {
          const rawAtts: string[] = m.attachments || [];
          const atts: SupportAttachment[] = rawAtts.map((url) => ({
            url,
            path: url,
            type: "application/octet-stream",
            kind: url.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? "image" : url.match(/\.(mp3|wav|ogg)$/i) ? "audio" : "file",
            name: url.split("/").pop() || "Attachment",
            size: 0,
          }));

          return {
            id: m.id,
            ticket_id: m.ticket_id,
            sender_type: (m.sender_type as any) || "customer",
            sender_id: m.sender_id || "",
            sender_name: m.sender_type === "admin" ? "Admin" : m.sender_type === "staff" ? "Support Agent" : "User / Seller",
            content: m.message,
            attachments: atts,
            created_at: m.created_at,
            read_at: m.created_at,
          };
        });

        setMessages(formatted);
        setLoading(false);
      }
    } else {
      setTicketSource("seller_support_tickets");
      const { data } = await supabase
        .from("seller_support_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (!isCancel()) {
        setMessages((data || []) as any);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetchChatMessages(() => cancel);
    return () => { cancel = true; };
  }, [ticketId, sourceTable]);

  // Realtime subscription & 3s polling sync
  useEffect(() => {
    if (!ticketId) return;

    if (isDirectConv || ticketSource === "conversations") {
      const channel = supabase
        .channel(`conv-chat-${ticketId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${ticketId}` },
          () => {
            fetchChatMessages(() => false);
          }
        )
        .subscribe();

      const timer = setInterval(() => {
        fetchChatMessages(() => false);
      }, 3000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(timer);
      };
    } else {
      const tableToListen = ticketSource === "support_tickets" ? "ticket_messages" : "seller_support_messages";

      const channel = supabase
        .channel(`support-chat-${ticketId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: tableToListen, filter: `ticket_id=eq.${ticketId}` }, () => {
          fetchChatMessages(() => false);
        })
        .subscribe();

      const timer = setInterval(() => {
        fetchChatMessages(() => false);
      }, 3000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(timer);
      };
    }
  }, [ticketId, ticketSource, isDirectConv]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (readOnly) return;
    if (!text.trim() && pendingFiles.length === 0) return;
    setSending(true);

    try {
      const uploads: SupportAttachment[] = [];
      for (const f of pendingFiles) uploads.push(await uploadFile(f, ticketId));
      const preview = text.trim() || (uploads[0]?.kind === "image" ? "📷 Photo" : uploads[0] ? `📎 ${uploads[0].name}` : "");
      const nowIso = new Date().toISOString();

      if (isDirectConv || ticketSource === "conversations") {
        const newMsgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        
        // 1. Insert into messages table
        const { error: msgErr } = await supabase.from("messages").insert({
          id: newMsgId,
          conversation_id: ticketId,
          sender_id: senderId || "admin",
          sender_type: "seller",
          content: text.trim() || preview,
          created_at: nowIso,
          is_read: false,
        });
        if (msgErr) console.error("Message insert error:", msgErr);

        // 2. Also insert into seller_support_messages for safety
        try {
          await supabase.from("seller_support_messages").insert({
            id: newMsgId,
            ticket_id: ticketId,
            sender_type: senderType,
            sender_id: senderId || "admin",
            sender_name: senderName || "Admin",
            content: text.trim() || preview,
            created_at: nowIso,
            attachments: uploads as any,
          });
        } catch {}

        // Optimistically add to messages
        const localMsg: SupportMessage = {
          id: newMsgId,
          ticket_id: ticketId,
          sender_type: senderType,
          sender_id: senderId || "admin",
          sender_name: senderName || "Admin",
          content: text.trim() || preview,
          attachments: uploads,
          created_at: nowIso,
          read_at: nowIso,
        };
        setMessages((prev) => (prev.some((m) => m.id === localMsg.id) ? prev : [...prev, localMsg]));

        // Update conversation
        const { data: convData } = await supabase.from("conversations").select("buyer_unread_count").eq("id", ticketId).maybeSingle();
        await supabase.from("conversations").update({
          last_message_at: nowIso,
          last_message: text.trim() || preview,
          seller_unread_count: 0,
          buyer_unread_count: ((convData?.buyer_unread_count || 0) + 1),
        }).eq("id", ticketId);

      } else if (ticketSource === "support_tickets") {
        const msgPayload = {
          ticket_id: ticketId,
          sender_id: senderId,
          sender_type: senderType,
          message: text.trim() || preview,
          attachments: uploads.map((u) => u.url),
          is_internal: false,
        };

        const { error: insertErr } = await supabase.from("ticket_messages").insert(msgPayload);
        if (insertErr) throw insertErr;

        await supabase.from("support_tickets").update({ status: "open", updated_at: nowIso }).eq("id", ticketId);
      } else {
        const isAdmin = senderType === "admin";
        const msgPayload = {
          ticket_id: ticketId,
          sender_type: senderType,
          sender_id: senderId,
          sender_name: senderName,
          content: text.trim() || null,
          attachments: uploads as any,
        };

        if (isAdmin) {
          const { error } = await adminDb.insert("seller_support_messages", msgPayload);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("seller_support_messages").insert(msgPayload);
          if (error) throw error;
        }

        const { data: t } = await supabase.from("seller_support_tickets").select("staff_unread_count,seller_unread_count").eq("id", ticketId).single();
        const updates: any = { last_message_at: nowIso, last_message_preview: preview.slice(0, 120), status: "open" };
        if (senderType === "seller") updates.staff_unread_count = (t?.staff_unread_count || 0) + 1;
        else updates.seller_unread_count = (t?.seller_unread_count || 0) + 1;

        if (isAdmin) {
          await adminDb.update("seller_support_tickets", updates, { id: ticketId });
        } else {
          await supabase.from("seller_support_tickets").update(updates).eq("id", ticketId);
        }
      }

      setText("");
      setPendingFiles([]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between bg-card">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h3 className="font-semibold text-sm">
              {convDetails?.buyer_name ? `Chat with ${convDetails.buyer_name}` : (headerTitle || "Support Conversation")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {convDetails?.buyer_email ? `Customer: ${convDetails.buyer_email}` : (headerSubtitle || `Ticket ID: #${ticketId.slice(0, 8)}`)}
            </p>
          </div>
        </div>
      </div>

      {/* Product Reference Card if chatting about a product */}
      {convDetails?.product_name && (
        <div className="px-4 py-2.5 bg-muted/40 border-b flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {convDetails.product_image ? (
              <img src={convDetails.product_image} alt="" className="w-9 h-9 rounded-lg object-cover border shrink-0 bg-white" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{convDetails.product_name}</p>
              {convDetails.product_price && (
                <p className="text-[11px] font-bold text-orange-600">৳{Number(convDetails.product_price).toLocaleString()}</p>
              )}
            </div>
          </div>
          {convDetails.product_slug && (
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1 shrink-0">
              <a href={`/product/${convDetails.product_slug}`} target="_blank" rel="noopener noreferrer">
                View Product <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No messages yet. Send a reply to start the conversation.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => {
              const isMe = m.sender_type === senderType || (senderType === "admin" && (m.sender_type === "staff" || m.sender_type === "admin"));
              return (
                <div key={m.id} className={cn("flex flex-col max-w-[80%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {m.sender_name || (isMe ? "You" : m.sender_type.toUpperCase())}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(m.created_at), "h:mm a")}
                    </span>
                  </div>
                  <div className={cn("rounded-lg p-3 text-xs shadow-sm", isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                    {m.content && <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {m.attachments.map((att, i) => (
                          <AttachmentView key={i} att={att} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      {!readOnly && (
        <div className="p-3 border-t bg-card space-y-2">
          {pendingFiles.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {pendingFiles.map((f, i) => (
                <span key={i} className="bg-muted px-2 py-1 rounded text-[11px] font-mono">
                  📎 {f.name}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) setPendingFiles(Array.from(e.target.files));
              }}
            />
            <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="h-9 w-9 shrink-0">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) send(); }}
              placeholder="Type your response..."
              className="h-9 text-xs flex-1"
            />
            <Button onClick={send} disabled={sending || (!text.trim() && pendingFiles.length === 0)} className="h-9 px-3">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
