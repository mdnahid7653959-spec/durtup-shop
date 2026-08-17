import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/firebaseAdapter";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Bell, Send, Users, CheckCircle, XCircle, Loader2, ImageIcon, LinkIcon } from "lucide-react";
import { format } from "date-fns";

interface PushNotification {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  action_url: string | null;
  target_type: string;
  sent_count: number;
  failed_count: number;
  status: string;
  sent_by: string | null;
  created_at: string;
  sent_at: string | null;
}

interface TokenStats {
  total: number;
  android: number;
  ios: number;
  web: number;
}

const ADMIN_SESSION_KEY = "megamart_admin_session";

export default function AdminPushNotifications() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [tokenStats, setTokenStats] = useState<TokenStats>({ total: 0, android: 0, ios: 0, web: 0 });
  
  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [targetType, setTargetType] = useState<"all" | "segment" | "individual">("all");

  useEffect(() => {
    fetchNotifications();
    fetchTokenStats();
  }, []);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("push_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data);
    }
  };

  const fetchTokenStats = async () => {
    const { data, error } = await supabase
      .from("push_tokens")
      .select("platform")
      .eq("is_active", true);

    if (!error && data) {
      const stats: TokenStats = { total: data.length, android: 0, ios: 0, web: 0 };
      data.forEach((token) => {
        if (token.platform === "android") stats.android++;
        else if (token.platform === "ios") stats.ios++;
        else if (token.platform === "web") stats.web++;
      });
      setTokenStats(stats);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      toast({ title: "Error", description: "Title and message are required", variant: "destructive" });
      return;
    }

    // Get session token from localStorage
    const storedSession = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!storedSession) {
      toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
      return;
    }
    const session = JSON.parse(storedSession);

    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke("send-push-notification", {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
        body: {
          title: title.trim(),
          message: message.trim(),
          image_url: imageUrl.trim() || undefined,
          action_url: actionUrl.trim() || undefined,
          target_type: targetType,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      toast({
        title: "Notification Sent!",
        description: `Successfully sent to ${result.sent} devices (${result.failed} failed)`,
      });

      // Reset form
      setTitle("");
      setMessage("");
      setImageUrl("");
      setActionUrl("");
      
      // Refresh list
      fetchNotifications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send notification",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-emerald-600"><CheckCircle className="w-3 h-3 mr-1" /> Sent</Badge>;
      case "sending":
        return <Badge className="bg-sky-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Sending</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout title="Push Notifications">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Push Notifications
          </h1>
          <p className="text-muted-foreground">Send push notifications to your mobile app users</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{tokenStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Devices</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-green-500 rounded text-white flex items-center justify-center text-xs">A</div>
                <div>
                  <p className="text-2xl font-bold">{tokenStats.android}</p>
                  <p className="text-xs text-muted-foreground">Android</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gray-800 rounded text-white flex items-center justify-center text-xs">i</div>
                <div>
                  <p className="text-2xl font-bold">{tokenStats.ios}</p>
                  <p className="text-xs text-muted-foreground">iOS</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-500 rounded text-white flex items-center justify-center text-xs">W</div>
                <div>
                  <p className="text-2xl font-bold">{tokenStats.web}</p>
                  <p className="text-xs text-muted-foreground">Web</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Send Notification Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send New Notification
              </CardTitle>
              <CardDescription>Compose and send a push notification to app users</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendNotification} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Notification title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Notification message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imageUrl" className="flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" /> Image URL (optional)
                  </Label>
                  <Input
                    id="imageUrl"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    type="url"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actionUrl" className="flex items-center gap-1">
                    <LinkIcon className="h-4 w-4" /> Action URL (optional)
                  </Label>
                  <Input
                    id="actionUrl"
                    placeholder="/products/123 or https://..."
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select value={targetType} onValueChange={(v) => setTargetType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users ({tokenStats.total} devices)</SelectItem>
                      <SelectItem value="segment" disabled>User Segment (Coming Soon)</SelectItem>
                      <SelectItem value="individual" disabled>Individual Users (Coming Soon)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Notification {tokenStats.total === 0 && "(No devices yet)"}
                    </>
                  )}
                </Button>
                {tokenStats.total === 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    ⚠️ No device registered yet. When users log in to the app, their devices will automatically be registered.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>History of sent push notifications</CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No notifications sent yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {notifications.map((notif) => (
                    <div key={notif.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{notif.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">{notif.message}</p>
                        </div>
                        {getStatusBadge(notif.status)}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {notif.sent_at 
                            ? format(new Date(notif.sent_at), "MMM d, yyyy HH:mm")
                            : format(new Date(notif.created_at), "MMM d, yyyy HH:mm")
                          }
                        </span>
                        <span>
                          ✓ {notif.sent_count} sent | ✗ {notif.failed_count} failed
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
