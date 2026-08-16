import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/firebaseAdapter";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string | null;
  last_message_at: string | null;
  seller_unread_count: number | null;
  buyer_unread_count: number | null;
  created_at: string;
  buyer_name?: string;
  buyer_email?: string;
  product_name?: string;
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

export default function SellerMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get seller
  const { data: seller } = useQuery({
    queryKey: ["seller", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch conversations
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ["seller-conversations", seller?.id],
    queryFn: async () => {
      if (!seller?.id) return [];
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("seller_id", seller.id)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;

      // Enrich with buyer info and last message
      const enriched = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", conv.buyer_id)
            .single();

          let product_name: string | undefined;
          if (conv.product_id) {
            const { data: prod } = await supabase
              .from("products")
              .select("name")
              .eq("id", conv.product_id)
              .single();
            product_name = prod?.name;
          }

          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            ...conv,
            buyer_name: profile?.full_name || profile?.email || "Unknown Buyer",
            buyer_email: profile?.email,
            product_name,
            last_message: lastMsg?.content,
          } as Conversation;
        })
      );

      return enriched;
    },
    enabled: !!seller?.id,
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["conversation-messages", selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation?.id) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConversation.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedConversation?.id,
  });

  // Mark messages as read when opening conversation
  useEffect(() => {
    if (!selectedConversation?.id || !seller?.id) return;

    // Mark seller unread count as 0
    supabase
      .from("conversations")
      .update({ seller_unread_count: 0 })
      .eq("id", selectedConversation.id)
      .then();

    // Mark messages as read
    supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", selectedConversation.id)
      .eq("sender_type", "buyer")
      .eq("is_read", false)
      .then();
  }, [selectedConversation?.id, seller?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!selectedConversation?.id) return;

    const channel = supabase
      .channel(`messages-${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedConversation.id] });
          queryClient.invalidateQueries({ queryKey: ["seller-conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation?.id, queryClient]);

  // Send message
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversation || !seller?.id || !user?.id) throw new Error("Missing data");

      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        sender_type: "seller",
        content,
      });
      if (error) throw error;

      // Update conversation
      await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          buyer_unread_count: (selectedConversation.buyer_unread_count || 0) + 1,
        })
        .eq("id", selectedConversation.id);
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ["seller-conversations"] });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMessage.mutate(messageText.trim());
  };

  return (
    <SellerLayout title="Messages">
      <div className="flex h-[calc(100vh-140px)] border rounded-lg overflow-hidden bg-card">
        {/* Conversation List */}
        <div
          className={cn(
            "w-full md:w-80 border-r flex flex-col",
            selectedConversation ? "hidden md:flex" : "flex"
          )}
        >
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg">Messages</h2>
            <p className="text-sm text-muted-foreground">
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
            </p>
          </div>
          <ScrollArea className="flex-1">
            {loadingConversations ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">No messages yet</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={cn(
                    "w-full p-4 text-left border-b hover:bg-muted/50 transition-colors",
                    selectedConversation?.id === conv.id && "bg-muted"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(conv.buyer_name || "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{conv.buyer_name}</p>
                        {(conv.seller_unread_count || 0) > 0 && (
                          <Badge variant="default" className="ml-2 h-5 min-w-[20px] text-xs">
                            {conv.seller_unread_count}
                          </Badge>
                        )}
                      </div>
                      {conv.product_name && (
                        <p className="text-xs text-primary truncate">Re: {conv.product_name}</p>
                      )}
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.last_message || "No messages yet"}
                      </p>
                      {conv.last_message_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(conv.last_message_at), "dd MMM, h:mm a")}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div
          className={cn(
            "flex-1 flex flex-col",
            !selectedConversation ? "hidden md:flex" : "flex"
          )}
        >
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(selectedConversation.buyer_name || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{selectedConversation.buyer_name}</p>
                  {selectedConversation.product_name && (
                    <p className="text-xs text-muted-foreground">
                      About: {selectedConversation.product_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 p-8 text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">No messages in this conversation yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const isSeller = msg.sender_type === "seller";
                      return (
                        <div
                          key={msg.id}
                          className={cn("flex", isSeller ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[75%] rounded-2xl px-4 py-2.5",
                              isSeller
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted rounded-bl-md"
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p
                              className={cn(
                                "text-[10px] mt-1",
                                isSeller ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}
                            >
                              {format(new Date(msg.created_at), "h:mm a")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <form onSubmit={handleSend} className="p-4 border-t flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!messageText.trim() || sendMessage.isPending}>
                  {sendMessage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg">Select a conversation</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Choose a conversation from the left to start messaging
              </p>
            </div>
          )}
        </div>
      </div>
    </SellerLayout>
  );
}
