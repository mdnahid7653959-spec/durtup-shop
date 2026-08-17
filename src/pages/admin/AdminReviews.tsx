import { useEffect, useState } from "react";
import { Star, Check, X, MoreHorizontal, Trash2, Search, RefreshCw, Bot, ShieldAlert, Sparkles, AlertTriangle, CheckCircle, ThumbsUp } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { adminDb } from "@/lib/adminDb";
import { supabase } from "@/lib/firebaseAdapter";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";

export interface ReviewModerationLog {
  id: string;
  review_id: string;
  ai_sentiment: "positive" | "neutral" | "negative" | string | null;
  toxicity_score: number | null;
  spam_score: number | null;
  auto_action: "approved" | "flagged_for_review" | "auto_rejected" | "passed" | string | null;
  flagged_keywords: string[] | null;
  moderated_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  // Joined AI Moderation Log
  moderation_log?: ReviewModerationLog | null;
  user_name?: string;
  product_title?: string;
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchReviews = async () => {
    setLoading(true);
    let reviewMap = new Map<string, Review>();

    // 1. Fetch from Supabase / adminDb
    try {
      const { data: reviewsData } = await adminDb.select<Review>("reviews", {
        columns: "*",
        orderBy: { col: "created_at", ascending: false },
      });
      if (reviewsData && reviewsData.length > 0) {
        reviewsData.forEach(r => reviewMap.set(r.id, r));
      }
    } catch (e) {}

    // 2. Fetch from Firestore reviews collection
    try {
      const snap = await getDocs(collection(db, "reviews"));
      if (!snap.empty) {
        snap.forEach(d => {
          const data = d.data();
          const key = d.id;
          reviewMap.set(key, {
            id: key,
            product_id: data.product_id || "general",
            user_id: data.user_id || "",
            rating: Number(data.rating || 5),
            title: data.title || null,
            comment: data.comment || "",
            is_approved: data.is_approved !== false,
            created_at: data.created_at || new Date().toISOString(),
            user_name: data.user_name || "Customer",
            product_title: data.product_title || data.product_name || `Product #${(data.product_id || key).slice(0, 8)}`
          });
        });
      }
    } catch (fsErr) {
      console.warn("Firestore reviews fetch notice:", fsErr);
    }

    // 3. Fetch from LocalStorage
    try {
      const adminRevRaw = localStorage.getItem("enterprise_admin_reviews");
      if (adminRevRaw) {
        const localList = JSON.parse(adminRevRaw);
        if (Array.isArray(localList)) {
          localList.forEach((r: any) => {
            const key = r.id || `rev-${r.created_at}`;
            if (!reviewMap.has(key)) {
              reviewMap.set(key, {
                id: key,
                product_id: r.product_id || "general",
                user_id: r.user_id || "",
                rating: Number(r.rating || 5),
                title: r.title || null,
                comment: r.comment || "",
                is_approved: r.is_approved !== false,
                created_at: r.created_at || new Date().toISOString(),
                user_name: r.user_name || "Customer",
                product_title: r.product_title || `Product #${(r.product_id || key).slice(0, 8)}`
              });
            }
          });
        }
      }

      // Check product-specific local reviews
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("local_reviews_")) {
          const prodId = k.replace("local_reviews_", "");
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((r: any) => {
                const revKey = r.id || `rev-${prodId}-${r.created_at}`;
                if (!reviewMap.has(revKey)) {
                  reviewMap.set(revKey, {
                    id: revKey,
                    product_id: prodId,
                    user_id: r.user_id || "",
                    rating: Number(r.rating || 5),
                    title: r.title || null,
                    comment: r.comment || "",
                    is_approved: r.is_approved !== false,
                    created_at: r.created_at || new Date().toISOString(),
                    user_name: r.user_name || "Customer",
                    product_title: `Product #${prodId.slice(0, 8)}`
                  });
                }
              });
            }
          }
        }
      }
    } catch {}

    const list = Array.from(reviewMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setReviews(list);
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();

    // Realtime listeners
    const unsub = onSnapshot(collection(db, "reviews"), () => fetchReviews(), () => {});
    const onStorage = () => fetchReviews();
    window.addEventListener("storage", onStorage);

    return () => {
      unsub();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReviews();
    setRefreshing(false);
    toast({ title: "Reviews refreshed" });
  };

  const handleApprove = async (id: string) => {
    try {
      setReviews(prev => prev.map(r => r.id === id ? { ...r, is_approved: true } : r));
      try {
        await setDoc(doc(db, "reviews", id), { is_approved: true, updated_at: new Date().toISOString() }, { merge: true });
      } catch {}
      try {
        await supabase.from("reviews").update({ is_approved: true }).eq("id", id);
      } catch {}
      toast({ title: "Review Approved", description: "The review is now publicly visible." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to approve review" });
    }
  };

  const handleReject = async (id: string) => {
    try {
      setReviews(prev => prev.map(r => r.id === id ? { ...r, is_approved: false } : r));
      try {
        await setDoc(doc(db, "reviews", id), { is_approved: false, updated_at: new Date().toISOString() }, { merge: true });
      } catch {}
      try {
        await supabase.from("reviews").update({ is_approved: false }).eq("id", id);
      } catch {}
      toast({ title: "Review Rejected", description: "The review has been hidden." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to reject review" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this review?")) return;
    try {
      setReviews(prev => prev.filter(r => r.id !== id));
      try {
        await deleteDoc(doc(db, "reviews", id));
      } catch {}
      try {
        await supabase.from("reviews").delete().eq("id", id);
      } catch {}
      try {
        const raw = localStorage.getItem("enterprise_admin_reviews");
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const filtered = list.filter((r: any) => r.id !== id);
            localStorage.setItem("enterprise_admin_reviews", JSON.stringify(filtered));
          }
        }
      } catch {}
      toast({ title: "Review Deleted", description: "The review has been removed." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to delete review" });
    }
  };

  // Filter reviews based on tabs & search query
  const filteredReviews = reviews.filter((r) => {
    if (filterTab === "approved" && !r.is_approved) return false;
    if (filterTab === "pending" && r.is_approved) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchComment = r.comment?.toLowerCase().includes(q);
      const matchTitle = r.title?.toLowerCase().includes(q);
      const matchUser = r.user_name?.toLowerCase().includes(q);
      const matchProduct = r.product_title?.toLowerCase().includes(q);
      return matchComment || matchTitle || matchUser || matchProduct;
    }
    return true;
  });

  const totalReviews = reviews.length;
  const approvedCount = reviews.filter((r) => r.is_approved).length;
  const pendingCount = reviews.filter((r) => !r.is_approved).length;
  const avgRating = totalReviews > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1) : "5.0";

  return (
    <AdminLayout title="Reviews">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Star className="h-6 w-6 text-warning fill-warning" />
              Customer Reviews & Moderation
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor, approve, and manage customer product ratings & feedback
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Reviews</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{totalReviews}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Across all products</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Star className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-medium">Average Rating</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{avgRating} ★</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Customer satisfaction</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <ThumbsUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium">Approved Reviews</p>
                <h3 className="text-2xl font-bold text-blue-600 mt-1">{approvedCount}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Live in storefront</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <CheckCircle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 font-medium">Pending Moderation</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting review</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Tabs value={filterTab} onValueChange={setFilterTab} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-3 w-full sm:w-auto">
              <TabsTrigger value="all" className="text-xs">All Reviews</TabsTrigger>
              <TabsTrigger value="approved" className="text-xs">Approved</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by comment, user, product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Reviews Table */}
        <div className="border rounded-xl bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs">Rating</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Product</TableHead>
                <TableHead className="text-xs">Comment</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading reviews...
                  </TableCell>
                </TableRow>
              ) : filteredReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No reviews found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReviews.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm">{r.rating}</span>
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-foreground">
                      {r.user_name || "Customer"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                      {r.product_title || `Product #${r.product_id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell className="text-xs max-w-[280px]">
                      {r.title && <p className="font-semibold text-foreground truncate">{r.title}</p>}
                      <p className="text-muted-foreground line-clamp-2">{r.comment}</p>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.is_approved ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-medium">
                          Live / Approved
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 font-medium">
                          Pending Moderation
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!r.is_approved ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(r.id)}
                            className="h-7 px-2 text-xs text-emerald-600 hover:bg-emerald-50"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(r.id)}
                            className="h-7 px-2 text-xs text-amber-600 hover:bg-amber-50"
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Hide
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(r.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
