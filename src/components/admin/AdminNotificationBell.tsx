import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, ShoppingCart, CheckCheck, Volume2, ShieldAlert, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAdminOrderNotifications } from "@/hooks/useAdminOrderNotifications";
import { formatDistanceToNow } from "date-fns";

export function AdminNotificationBell() {
  const {
    notifications,
    unreadCount,
    permission,
    requestPermission,
    markAsRead,
    markAllAsRead,
    playNewOrderSound
  } = useAdminOrderNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleNotificationClick = (item: any) => {
    markAsRead(item.id);
    setOpen(false);
    navigate("/admin/orders");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-foreground hover:bg-muted"
          aria-label="Admin Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white shadow-sm animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-xl border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h4 className="font-bold text-sm text-foreground">Order Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-[10px] h-5 px-1.5 font-bold">
                {unreadCount} New
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={playNewOrderSound}
              title="Test Chime Sound"
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Volume2 className="h-3.5 w-3.5 mr-1 text-primary" /> Test
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Permission Request Prompt if not granted */}
        {permission !== "granted" && (
          <div className="p-3 bg-primary/10 border-b border-primary/20 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
              <p className="text-[11px] text-foreground font-medium truncate">
                Enable mobile push alerts for new orders
              </p>
            </div>
            <Button
              size="sm"
              onClick={requestPermission}
              className="h-7 px-2.5 text-xs font-bold shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Enable 🔔
            </Button>
          </div>
        )}

        {/* Notifications List */}
        <div className="max-h-[340px] overflow-y-auto divide-y divide-border/50">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground space-y-2">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">No order notifications yet</p>
              <p className="text-xs text-muted-foreground">New customer orders will appear here in real time.</p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`p-3 sm:p-3.5 flex items-start gap-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                  !item.read ? "bg-primary/5" : ""
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <p className="text-xs font-bold text-foreground truncate">
                      {item.title || `New Order #${item.order_number || item.id.slice(0, 6)}`}
                    </p>
                    {!item.read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.message || `Customer: ${item.customer_name || "Guest"} • ৳${(item.total_amount || 0).toLocaleString()}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 mt-1">
                    {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : "Just now"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t bg-muted/20 text-center">
          <Link
            to="/admin/orders"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline py-1"
          >
            View All Orders <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
