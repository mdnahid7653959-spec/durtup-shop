import { useState } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaff } from "@/contexts/StaffContext";
import { useAuth } from "@/contexts/AuthContext";
import { SupportTicketList } from "@/components/support/SupportTicketList";
import { SupportChatPanel } from "@/components/support/SupportChatPanel";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StaffMessages() {
  const { staff } = useStaff();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <StaffLayout>
      <div className="flex h-[calc(100vh-100px)] border rounded-lg overflow-hidden bg-card">
        <div className={cn("w-full md:w-80 border-r flex flex-col", selected ? "hidden md:flex" : "flex")}>
          <SupportTicketList perspective="staff" selectedId={selected} onSelect={setSelected} />
        </div>
        <div className={cn("flex-1 flex flex-col", !selected ? "hidden md:flex" : "flex")}>
          {selected && staff && user ? (
            <SupportChatPanel
              ticketId={selected}
              senderType="staff"
              senderId={user.id}
              senderName={staff.full_name}
              headerTitle="Seller Chat"
              headerSubtitle="Reply to seller support ticket"
              onBack={() => setSelected(null)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg">Seller Support Inbox</h3>
              <p className="text-muted-foreground text-sm mt-1">Select a ticket to reply. Sellers can send text, images, voice notes, and documents.</p>
            </div>
          )}
        </div>
      </div>
    </StaffLayout>
  );
}
