import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/firebaseAdapter";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Loader2, ShieldCheck, ExternalLink, Package } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getCachedMohasagorProducts } from "@/utils/mohasagorCache";
import { toast } from "sonner";

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string | null;
  last_message_at: string | null;
  buyer_unread_count: number | null;
  seller_unread_count: number | null;
  created_at: string;
  seller_name?: string;
  product_name?: string;
  product_image?: string;
  product_price?: number;
  product_slug?: string;
  last_message?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  is_read: boolean | null;
  created_at: string;
}

export default function BuyerMessages() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(conversationId || null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync route param changes
  useEffect(() => {
    if (conversationId) {
      setSelectedConvId(conversationId);
    }
  }, [conversationId]);

  // Fetch all conversations for buyer
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ["buyer-conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("buyer_id", user.id)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;

      const catalog = await getCachedMohasagorProducts();

      const enriched = await Promise.all(
        (data || []).map(async (conv) => {
          let seller_name = "Durtup Official Support";
          if (conv.seller_id && conv.seller_id !== "admin" && conv.seller_id !== "durtup_official") {
            const { data: sellerData } = await supabase
              .from("sellers")
              .select("shop_name")
              .eq("id", conv.seller_id)
              .maybeSingle();
            seller_name = sellerData?.shop_name || "Store Partner";
          }

          let product_name: string | undefined;
          let product_image: string | undefined;
          let product_price: number | undefined;
          let product_slug: string | undefined;

          if (conv.product_id) {
            const matched = catalog.find(p => p.id === conv.product_id || p.slug === conv.product_id);
            if (matched) {
              product_name = matched.name;
              product_image = matched.image;
              product_price = matched.price;
              product_slug = matched.slug;
            } else {
              const { data: prod } = await supabase
                .from("products")
                .select("id, name, slug, discount_price, regular_price, image")
                .eq("id", conv.product_id)
                .maybeSingle();
              if (prod) {
                product_name = prod.name;
                product_slug = prod.slug;
                product_image = prod.image;
                product_price = prod.discount_price || prod.regular_price;
              }
            }
          }

          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...conv,
            seller_name,
            product_name,
            product_image,
            product_price,
            product_slug,
            last_message: lastMsg?.content || conv.last_message,
          } as Conversation;
        })
      );

      return enriched;
    },
    enabled: !!user?.id,
  });

  // Fetch individual conversation if not in list yet or directly navigated to via URL
  const { data: directConv } = useQuery({
    queryKey: ["single-conversation", selectedConvId],
    queryFn: async () => {
      if (!selectedConvId) return null;
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", selectedConvId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      let seller_name = "Store Partner";
      if (data.seller_id === "admin" || data.seller_id === "durtup_official") {
        seller_name = "Durtup Official Store";
      } else {
        const { data: s } = await supabase.from("sellers").select("shop_name").eq("id", data.seller_id).maybeSingle();
        if (s?.shop_name) seller_name = s.shop_name;
      }

      let product_name: string | undefined;
      let product_image: string | undefined;
      let product_price: number | undefined;
      let product_slug: string | undefined;

      if (data.product_id) {
        const catalog = await getCachedMohasagorProducts().catch(() => []);
        const found = catalog.find((p: any) => p.id === data.product_id || p.slug === data.product_id);
        if (found) {
          product_name = found.name;
          product_image = found.image;
          product_price = found.price;
          product_slug = found.slug;
        } else {
          const { data: p } = await supabase.from("products").select("name, image, discount_price, regular_price, slug").eq("id", data.product_id).maybeSingle();
          if (p) {
            product_name = p.name;
            product_image = p.image;
            product_price = p.discount_price || p.regular_price;
            product_slug = p.slug;
          }
        }
      }

      return {
        ...data,
        seller_name,
        product_name,
        product_image,
        product_price,
        product_slug,
      } as Conversation;
    },
    enabled: !!selectedConvId
  });

  const selectedConv = conversations.find((c) => c.id === selectedConvId) || directConv || null;

  // Build combined conversation list including direct active chat
  const displayedConversations = [...conversations];
  if (selectedConv && !displayedConversations.some(c => c.id === selectedConv.id)) {
    displayedConversations.unshift(selectedConv);
  }

  // Fetch messages
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["conversation-messages", selectedConvId],
    queryFn: async () => {
      if (!selectedConvId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConvId)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("Error fetching messages:", error);
      }
      
      const list = ((data || []) as Message[]).slice();

      // Also merge any messages from seller_support_messages where ticket_id = selectedConvId
      try {
        const { data: ssm } = await supabase
          .from("seller_support_messages")
          .select("*")
          .eq("ticket_id", selectedConvId);

        if (ssm && ssm.length > 0) {
          ssm.forEach((sm: any) => {
            const smContent = sm.content || sm.message || "";
            if (!list.some(m => m.id === sm.id || (m.content === smContent && Math.abs(new Date(m.created_at).getTime() - new Date(sm.created_at).getTime()) < 5000))) {
              list.push({
                id: sm.id,
                conversation_id: selectedConvId,
                sender_id: sm.sender_id || "admin",
                sender_type: sm.sender_type === "buyer" ? "buyer" : "seller",
                content: smContent,
                is_read: sm.is_read ?? false,
                created_at: sm.created_at || new Date().toISOString(),
              });
            }
          });
          list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
      } catch {}

      return list;
    },
    enabled: !!selectedConvId,
  });

  // Realtime subscription for incoming messages from seller/admin + 3s poll fallback
  useEffect(() => {
    if (!selectedConvId) return;

    const channel = supabase
      .channel(`buyer-chat-sync-${selectedConvId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConvId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedConvId] });
          queryClient.invalidateQueries({ queryKey: ["buyer-conversations"] });
          queryClient.invalidateQueries({ queryKey: ["single-conversation", selectedConvId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "seller_support_messages", filter: `ticket_id=eq.${selectedConvId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedConvId] });
          queryClient.invalidateQueries({ queryKey: ["buyer-conversations"] });
          queryClient.invalidateQueries({ queryKey: ["single-conversation", selectedConvId] });
        }
      )
      .subscribe();

    const timer = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedConvId] });
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [selectedConvId, queryClient]);

  // Mark as read
  useEffect(() => {
    const uid = user?.id || (user as any)?.uid;
    if (!selectedConvId || !uid) return;
    supabase.from("conversations").update({ buyer_unread_count: 0 }).eq("id", selectedConvId).then();
    supabase.from("messages").update({ is_read: true }).eq("conversation_id", selectedConvId).eq("sender_type", "seller").eq("is_read", false).then();
  }, [selectedConvId, user]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const senderUserId = user?.id || (user as any)?.uid;
      if (!selectedConvId || !senderUserId) throw new Error("Please log in to send a message");

      const nowIso = new Date().toISOString();
      const newMsgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Ensure conversation exists in DB
      const { data: existing } = await supabase.from("conversations").select("id").eq("id", selectedConvId).maybeSingle();
      if (!existing?.id) {
        await supabase.from("conversations").insert({
          id: selectedConvId,
          buyer_id: senderUserId,
          seller_id: selectedConv?.seller_id || "admin",
          product_id: selectedConv?.product_id || null,
          last_message_at: nowIso,
          last_message: content,
          seller_unread_count: 1,
          buyer_unread_count: 0,
          created_at: nowIso
        });
      }

      // 1. Insert into messages table
      const { error } = await supabase.from("messages").insert({
        id: newMsgId,
        conversation_id: selectedConvId,
        sender_id: senderUserId,
        sender_type: "buyer",
        content,
        created_at: nowIso,
        is_read: false
      });
      if (error) console.error("Error inserting message into messages:", error);

      // 2. Also insert into seller_support_messages table for compatibility
      try {
        await supabase.from("seller_support_messages").insert({
          id: newMsgId,
          ticket_id: selectedConvId,
          sender_id: senderUserId,
          sender_type: "buyer",
          sender_name: user?.displayName || "Customer",
          content,
          created_at: nowIso,
          attachments: []
        });
      } catch {}

      const currentUnread = selectedConv?.seller_unread_count ?? 0;
      await supabase.from("conversations").update({ 
        last_message_at: nowIso, 
        last_message: content,
        seller_unread_count: (typeof currentUnread === 'number' ? currentUnread : 0) + 1 
      }).eq("id", selectedConvId);

      return {
        id: newMsgId,
        conversation_id: selectedConvId,
        sender_id: senderUserId,
        sender_type: "buyer",
        content,
        is_read: false,
        created_at: nowIso
      };
    },
    onMutate: async (newContent: string) => {
      await queryClient.cancelQueries({ queryKey: ["conversation-messages", selectedConvId] });
      const previousMessages = queryClient.getQueryData<Message[]>(["conversation-messages", selectedConvId]) || [];
      const senderUserId = user?.id || (user as any)?.uid || "buyer";
      const optimisticMsg: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: selectedConvId!,
        sender_id: senderUserId,
        sender_type: "buyer",
        content: newContent,
        is_read: false,
        created_at: new Date().toISOString()
      };
      queryClient.setQueryData<Message[]>(["conversation-messages", selectedConvId], (old = []) => [...old, optimisticMsg]);
      return { previousMessages };
    },
    onError: (err: any, _newContent, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(["conversation-messages", selectedConvId], context.previousMessages);
      }
      toast.error(err?.message || "Failed to send message");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedConvId] });
      queryClient.invalidateQueries({ queryKey: ["buyer-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["single-conversation", selectedConvId] });
    },
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = messageText.trim();
    if (!text || sendMessage.isPending) return;
    setMessageText("");
    try {
      await sendMessage.mutateAsync(text);
    } catch {}
  };

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-4 pb-20 md:pb-6">
        <div className="flex h-[calc(100vh-180px)] border rounded-2xl overflow-hidden bg-card shadow-sm">
          
          {/* Left Sidebar: Conversation List */}
          <div className={cn("w-full md:w-80 border-r flex flex-col bg-muted/20", selectedConvId ? "hidden md:flex" : "flex")}>
            <div className="p-4 border-b bg-card">
              <h2 className="font-bold text-lg text-foreground">Messages</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{displayedConversations.length} active chat{displayedConversations.length !== 1 ? "s" : ""}</p>
            </div>
            
            <ScrollArea className="flex-1">
              {loadingConversations ? (
                <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : displayedConversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No active chats found. Click "Chat with Seller" on any product page to start.
                </div>
              ) : (
                displayedConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      navigate(`/messages/${conv.id}`);
                    }}
                    className={cn(
                      "w-full p-3.5 text-left border-b border-border/50 hover:bg-muted/60 transition-colors flex items-start gap-3",
                      selectedConvId === conv.id && "bg-card font-medium border-l-4 border-l-primary"
                    )}
                  >
                    <Avatar className="h-10 w-10 shrink-0 border">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                        {(conv.seller_name || "S")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-foreground truncate flex items-center gap-1">
                          {conv.seller_name}
                          {(conv.seller_id === "admin" || conv.seller_id === "durtup_official") && (
                            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                        </p>
                        {(conv.buyer_unread_count || 0) > 0 && (
                          <Badge className="h-5 px-1.5 text-[10px] bg-primary text-primary-foreground font-bold">{conv.buyer_unread_count}</Badge>
                        )}
                      </div>
                      {conv.product_name && (
                        <p className="text-xs text-primary font-medium truncate mt-0.5">
                          {conv.product_name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {conv.last_message || "Tap to chat"}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Right Main Chat Area */}
          <div className={cn("flex-1 flex flex-col bg-card", !selectedConvId ? "hidden md:flex" : "flex")}>
            {selectedConv ? (
              <>
                {/* Chat Top Bar */}
                <div className="p-3.5 px-5 border-b flex items-center gap-3 bg-card shadow-sm z-10">
                  <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setSelectedConvId(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-9 w-9 border">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {(selectedConv.seller_name || "S")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                      {selectedConv.seller_name}
                      {(selectedConv.seller_id === "admin" || selectedConv.seller_id === "durtup_official") && (
                        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">Official Store Representative</p>
                  </div>
                </div>

                {/* Attached Product Preview Banner */}
                {selectedConv.product_name && (
                  <div className="m-4 mb-1 p-3.5 rounded-2xl bg-muted/50 border border-primary/20 flex items-center gap-3 shadow-xs">
                    {selectedConv.product_image ? (
                      <img src={selectedConv.product_image} alt="" className="w-14 h-14 rounded-xl object-cover border bg-background shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Package className="h-7 w-7" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] uppercase tracking-wider text-primary font-bold">Inquired Product</span>
                      <p className="text-xs font-bold text-foreground truncate mt-0.5">{selectedConv.product_name}</p>
                      {selectedConv.product_price && (
                        <p className="text-xs text-primary font-extrabold mt-0.5">৳{selectedConv.product_price.toLocaleString()}</p>
                      )}
                    </div>
                    {selectedConv.product_slug && (
                      <Link 
                        to={`/product/${selectedConv.product_slug}`} 
                        className="text-xs px-3.5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1 shrink-0 shadow-xs"
                      >
                        View Product <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                )}

                {/* Messages Stream */}
                <ScrollArea className="flex-1 p-4">
                  {loadingMessages ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground text-sm">
                      Type your message below to chat with {selectedConv.seller_name}.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => {
                        const isBuyer = msg.sender_type === "buyer";
                        return (
                          <div key={msg.id} className={cn("flex", isBuyer ? "justify-end" : "justify-start")}>
                            <div className={cn("max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-xs", isBuyer ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted text-foreground border rounded-bl-none")}>
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                              <p className={cn("text-[10px] mt-1 text-right opacity-80", isBuyer ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                {format(new Date(msg.created_at || Date.now()), "h:mm a")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Input Bar */}
                <form onSubmit={handleSend} className="p-3.5 px-4 border-t flex items-center gap-2 bg-card">
                  <Input 
                    value={messageText} 
                    onChange={(e) => setMessageText(e.target.value)} 
                    placeholder="Write a message..." 
                    className="flex-1 rounded-xl h-11 bg-muted/30 border-muted focus-visible:ring-primary" 
                  />
                  <Button type="submit" size="icon" className="h-11 w-11 rounded-xl bg-primary text-primary-foreground shrink-0 shadow-sm" disabled={!messageText.trim() || sendMessage.isPending}>
                    {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                <p className="text-base font-semibold text-foreground">Select a Chat</p>
                <p className="text-xs mt-1">Choose a conversation from the sidebar to continue.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
