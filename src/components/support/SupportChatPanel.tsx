import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/firebaseAdapter";
import { adminDb } from "@/lib/adminDb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Paperclip, Send, Mic, Square, Loader2, MessageSquare, FileText, Image as ImageIcon, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

export function SupportChatPanel({ ticketId, senderType, senderId, senderName, readOnly, headerTitle, headerSubtitle, onBack }: Props) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [ticketSource, setTicketSource] = useState<"support_tickets" | "seller_support_tickets">("seller_support_tickets");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);

      // Check if ticketId exists in support_tickets table
      const { data: stRow } = await supabase.from("support_tickets").select("id, subject").eq("id", ticketId).maybeSingle();

      if (stRow) {
        setTicketSource("support_tickets");
        const { data: tmRows } = await supabase
          .from("ticket_messages")
          .select("*")
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true });

        if (!cancel) {
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

        if (!cancel) {
          setMessages((data || []) as any);
          setLoading(false);
        }
      }
    })();

    return () => { cancel = true; };
  }, [ticketId]);

  // Realtime subscription
  useEffect(() => {
    const tableToListen = ticketSource === "support_tickets" ? "ticket_messages" : "seller_support_messages";

    const channel = supabase
      .channel(`support-chat-${ticketId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: tableToListen, filter: `ticket_id=eq.${ticketId}` }, (payload: any) => {
        const raw = payload.new;
        if (ticketSource === "support_tickets") {
          const formattedMsg: SupportMessage = {
            id: raw.id,
            ticket_id: raw.ticket_id,
            sender_type: raw.sender_type || "customer",
            sender_id: raw.sender_id || "",
            sender_name: raw.sender_type === "admin" ? "Admin" : raw.sender_type === "staff" ? "Support Agent" : "User / Seller",
            content: raw.message,
            attachments: (raw.attachments || []).map((url: string) => ({
              url,
              path: url,
              type: "application/octet-stream",
              kind: url.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? "image" : "file",
              name: url.split("/").pop() || "Attachment",
              size: 0,
            })),
            created_at: raw.created_at,
            read_at: raw.created_at,
          };
          setMessages((m) => (m.some((x) => x.id === formattedMsg.id) ? m : [...m, formattedMsg]));
        } else {
          setMessages((m) => (m.some((x) => x.id === raw.id) ? m : [...m, raw]));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ticketId, ticketSource]);

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

      if (ticketSource === "support_tickets") {
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

        await supabase.from("support_tickets").update({ status: "open", updated_at: new Date().toISOString() }).eq("id", ticketId);
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
        const updates: any = { last_message_at: new Date().toISOString(), last_message_preview: preview.slice(0, 120), status: "open" };
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
            <h3 className="font-semibold text-sm">{headerTitle || "Support Conversation"}</h3>
            <p className="text-xs text-muted-foreground">{headerSubtitle || `Ticket ID: #${ticketId.slice(0, 8)}`}</p>
          </div>
        </div>
      </div>

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
