import { useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SupportTicketList } from "@/components/support/SupportTicketList";
import { SupportChatPanel } from "@/components/support/SupportChatPanel";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { MessageSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminSellerSupport() {
  const { admin } = useAdminAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<"support_tickets" | "seller_support_tickets" | "conversations" | undefined>(undefined);

  const handleSelect = (id: string, source?: "support_tickets" | "seller_support_tickets" | "conversations") => {
    setSelectedId(id);
    setSelectedSource(source);
  };

  return (
    <AdminLayout title="Seller Support">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          Monitor & reply to every seller conversation. Configure the auto-reply from Settings.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/settings?tab=support">
            <Settings className="h-4 w-4 mr-2" />
            Auto-Reply Settings
          </Link>
        </Button>
      </div>
      <div className="flex h-[calc(100vh-200px)] border rounded-lg overflow-hidden bg-card">
        <div className={cn("w-full md:w-80 border-r flex flex-col", selectedId ? "hidden md:flex" : "flex")}>
          <SupportTicketList perspective="admin" selectedId={selectedId} onSelect={handleSelect} />
        </div>
        <div className={cn("flex-1 flex flex-col", !selectedId ? "hidden md:flex" : "flex")}>
          {selectedId && admin ? (
            <SupportChatPanel
              ticketId={selectedId}
              sourceTable={selectedSource}
              senderType="admin"
              senderId={admin.id}
              senderName={admin.displayName || "Admin"}
              headerTitle="Seller ↔ Staff Conversation"
              headerSubtitle="Full read/write monitoring"
              onBack={() => {
                setSelectedId(null);
                setSelectedSource(undefined);
              }}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg">Monitor Seller Support</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-md">
                See every conversation between sellers and staff. You can also reply directly.
                Auto-reply message & timeout can be edited from <Link to="/admin/settings?tab=support" className="text-primary underline">Settings → Support Auto-Reply</Link>.
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
