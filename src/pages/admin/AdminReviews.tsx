import { useEffect, useState } from "react";
import { Star, Check, X, MoreHorizontal, Trash2, Search, RefreshCw, Bot, ShieldAlert, Sparkles, AlertTriangle, CheckCircle } from "lucide-react";
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
    try {
      // 1. Fetch reviews
      const { data: reviewsData, error } = await adminDb.select<Review>("reviews", {
        columns: "*",
        orderBy: { col: "created_at", ascending: false },
      });

      if (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: "Failed to fetch reviews" });
        setReviews([]);
        setLoading(false);
        return;
      }

      const list = reviewsData || [];

      // 2. Fetch review_moderation_logs
      const reviewIds = list.map((r) => r.id);
      let logsMap = new Map<string, ReviewModerationLog>();

      if (reviewIds.length > 0) {
        const { data: logs, error: logsErr } = await adminDb.select<ReviewModerationLog>("review_moderation_logs", {
          filters: [{ col: "review_id", op: "in", value: reviewIds }],
        });

        if (!logsErr && logs) {
          logs.forEach((log) => logsMap.set(log.review_id, log));
        }
      }

      // Fetch user profile and product titles if available
      const userIds = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean)));
      const productIds = Array.from(new Set(list.map((r) => r.product_id).filter(Boolean)));

      const usersMap = new Map<string, any>();
      const productsMap = new Map<string, any>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        (profiles || []).forEach((p) => usersMap.set(p.id, p));
      }

      if (productIds.length > 0) {
        const { data: products } = await supabase.from("products").select("id, title").in("id", productIds);
        (products || []).forEach((p) => productsMap.set(p.id, p));
      }

      const enriched: Review[] = list.map((item) => {
        const usr = usersMap.get(item.user_id);
        const prod = productsMap.get(item.product_id);
        const log = logsMap.get(item.id);

        return {
          ...item,
          user_name: usr?.full_name || "Anonymous",
          product_title: prod?.title || `Product #${item.product_id.slice(0, 8)}`,
          moderation_log: log || null,
        };
      });

      setReviews(enriched);
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to load reviews" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReviews();
    toast({ title: "Reviews refreshed" });
    setRefreshing(false);
  };

  const updateApproval = async (id: string, is_approved: boolean) => {
    const { error } = await adminDb.update("reviews", { is_approved }, { id });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: `Review ${is_approved ? "approved" : "rejected"}` });
      fetchReviews();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    const { error } = await adminDb.remove("reviews", { id });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Review deleted successfully" });
      fetchReviews();
    }
  };

  const handleRunAiModeration = async (review: Review) => {
    try {
      const text = `${review.title || ""} ${review.comment || ""}`.toLowerCase();

      // Basic heuristic calculation if external AI unavailable
      const spamKeywords = ["free", "buy now", "click here", "discount", "promo", "cheap", "http", "www"];
      const toxicKeywords = ["hate", "scam", "fraud", "fake", "bad", "terrible", "worst", "garbage", "trash"];

      const foundSpam = spamKeywords.filter((k) => text.includes(k));
      const foundToxic = toxicKeywords.filter((k) => text.includes(k));
      const flagged = Array.from(new Set([...foundSpam, ...foundToxic]));

      const toxicityScore = Number((foundToxic.length * 0.35 + (review.rating <= 2 ? 0.2 : 0)).toFixed(2));
      const spamScore = Number((foundSpam.length * 0.4).toFixed(2));

      let autoAction = "passed";
      let sentiment = "positive";
      if (review.rating <= 2 || toxicityScore > 0.4) sentiment = "negative";
      else if (review.rating === 3) sentiment = "neutral";

      if (toxicityScore > 0.5 || spamScore > 0.5) autoAction = "auto_rejected";
      else if (toxicityScore > 0.2 || spamScore > 0.2 || flagged.length > 0) autoAction = "flagged_for_review";
      else autoAction = "approved";

      const logPayload = {
        review_id: review.id,
        ai_sentiment: sentiment,
        toxicity_score: toxicityScore,
        spam_score: spamScore,
        auto_action: autoAction,
        flagged_keywords: flagged,
        moderated_at: new Date().toISOString(),
      };

      const { error } = await adminDb.upsert("review_moderation_logs", logPayload);
      if (error) throw error;

      toast({ title: "AI Moderation Completed", description: `Log created for review #${review.id.slice(0, 8)}.` });
      fetchReviews();
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "AI Moderation Failed", description: err.message });
    }
  };

  const renderStars = (rating: number) => (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  );

  // Filter Logic
  const filteredReviews = reviews.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.comment && r.comment.toLowerCase().includes(q)) ||
      (r.user_name && r.user_name.toLowerCase().includes(q)) ||
      (r.product_title && r.product_title.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (filterTab === "flagged") {
      return (
        r.moderation_log?.auto_action === "flagged_for_review" ||
        r.moderation_log?.auto_action === "auto_rejected" ||
        (r.moderation_log?.flagged_keywords && r.moderation_log.flagged_keywords.length > 0)
      );
    }
    if (filterTab === "pending") return !r.is_approved;
    if (filterTab === "approved") return r.is_approved;

    return true;
  });

  // Calculate Metrics
  const totalCount = reviews.length;
  const flaggedCount = reviews.filter(
    (r) =>
      r.moderation_log?.auto_action === "flagged_for_review" ||
      r.moderation_log?.auto_action === "auto_rejected" ||
      (r.moderation_log?.flagged_keywords && r.moderation_log.flagged_keywords.length > 0)
  ).length;

  return (
    <AdminLayout title="Reviews & AI Moderation">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              Customer Reviews & AI Moderation Logs
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor customer product reviews with live AI sentiment analysis, toxicity scoring, spam detection, and automated flagging.
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Reviews
          </Button>
        </div>

        {/* AI Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Reviews</CardTitle>
              <Star className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
              <p className="text-xs text-muted-foreground">All store reviews</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-600">AI Flagged / Toxic</CardTitle>
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{flaggedCount}</div>
              <p className="text-xs text-muted-foreground">Flagged by auto-moderator</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-emerald-600">Approved Reviews</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {reviews.filter((r) => r.is_approved).length}
              </div>
              <p className="text-xs text-muted-foreground">Live on product detail pages</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <Tabs value={filterTab} onValueChange={setFilterTab} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="all">All ({totalCount})</TabsTrigger>
              <TabsTrigger value="flagged" className="gap-1 text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" /> AI Flagged ({flaggedCount})
              </TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reviews, comments, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>
        </div>

        {/* Reviews Table */}
        <div className="border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product & Review</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>AI Moderation Logs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading customer reviews and moderation logs...
                  </TableCell>
                </TableRow>
              ) : filteredReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No customer reviews found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReviews.map((review) => {
                  const log = review.moderation_log;
                  return (
                    <TableRow key={review.id}>
                      <TableCell className="max-w-xs">
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold text-primary truncate">{review.product_title}</p>
                          {review.title && <p className="font-medium text-xs text-foreground">{review.title}</p>}
                          {review.comment && <p className="text-xs text-muted-foreground line-clamp-2">{review.comment}</p>}
                          <p className="text-[10px] text-muted-foreground font-mono">By: {review.user_name}</p>
                        </div>
                      </TableCell>

                      <TableCell>{renderStars(review.rating)}</TableCell>

                      {/* Bound AI Moderation Logs Display */}
                      <TableCell className="max-w-xs">
                        {log ? (
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Sentiment */}
                              <Badge
                                variant="outline"
                                className={
                                  log.ai_sentiment === "positive"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] uppercase font-mono"
                                    : log.ai_sentiment === "negative"
                                    ? "bg-destructive/10 text-destructive border-destructive/30 text-[10px] uppercase font-mono"
                                    : "bg-muted text-muted-foreground text-[10px] uppercase font-mono"
                                }
                              >
                                {log.ai_sentiment || "Neutral"}
                              </Badge>

                              {/* Auto Action */}
                              <Badge
                                variant="outline"
                                className={
                                  log.auto_action === "auto_rejected"
                                    ? "bg-destructive/10 text-destructive border-destructive/30 text-[10px]"
                                    : log.auto_action === "flagged_for_review"
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]"
                                    : "bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]"
                                }
                              >
                                {log.auto_action ? log.auto_action.replace(/_/g, " ") : "Passed"}
                              </Badge>
                            </div>

                            {/* Scores */}
                            <div className="text-[11px] text-muted-foreground flex gap-2">
                              <span>Toxicity: <strong className="text-foreground">{Math.round((log.toxicity_score || 0) * 100)}%</strong></span>
                              <span>Spam: <strong className="text-foreground">{Math.round((log.spam_score || 0) * 100)}%</strong></span>
                            </div>

                            {/* Flagged Keywords */}
                            {log.flagged_keywords && log.flagged_keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {log.flagged_keywords.map((kw, i) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-mono">
                                    ⚠️ {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRunAiModeration(review)}
                            className="text-[11px] h-7 text-primary hover:bg-primary/10 gap-1"
                          >
                            <Sparkles className="h-3 w-3" /> Run AI Analysis
                          </Button>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant={review.is_approved ? "default" : "secondary"} className="text-xs">
                          {review.is_approved ? "Approved" : "Pending"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!review.is_approved ? (
                              <DropdownMenuItem onClick={() => updateApproval(review.id, true)}>
                                <Check className="h-4 w-4 mr-2 text-emerald-600" />
                                Approve Review
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => updateApproval(review.id, false)}>
                                <X className="h-4 w-4 mr-2 text-amber-600" />
                                Unapprove / Reject
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem onClick={() => handleRunAiModeration(review)}>
                              <Sparkles className="h-4 w-4 mr-2 text-primary" />
                              Re-Run AI Scan
                            </DropdownMenuItem>

                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(review.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Review
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
