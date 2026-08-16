import { useState } from "react";
import { Star, ThumbsUp, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/firebaseAdapter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface ProductReviewsProps {
  productId: string;
  ratingAverage: number;
  ratingCount: number;
}

export function ProductReviews({ productId, ratingAverage, ratingCount }: ProductReviewsProps) {
  const [showAll, setShowAll] = useState(false);

  const { data: reviews = [] } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  // Calculate rating distribution
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    percentage: reviews.length > 0
      ? (reviews.filter((r) => r.rating === star).length / reviews.length) * 100
      : 0,
  }));

  const displayedReviews = showAll ? reviews : reviews.slice(0, 3);

  return (
    <div className="bg-card rounded-2xl border p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold text-foreground mb-4">
        Ratings & Reviews
      </h3>

      {/* Rating Summary */}
      <div className="flex flex-col sm:flex-row gap-6 mb-6">
        {/* Big rating number */}
        <div className="flex flex-col items-center justify-center min-w-[120px]">
          <span className="text-5xl font-bold text-foreground">
            {ratingAverage?.toFixed(1) || "0.0"}
          </span>
          <div className="flex items-center gap-0.5 mt-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < Math.floor(ratingAverage || 0)
                    ? "fill-warning text-warning"
                    : "fill-muted text-muted"
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground mt-1">
            {ratingCount || 0} reviews
          </span>
        </div>

        {/* Distribution bars */}
        <div className="flex-1 space-y-2">
          {distribution.map(({ star, count, percentage }) => (
            <div key={star} className="flex items-center gap-2 text-sm">
              <span className="w-3 text-muted-foreground">{star}</span>
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              <Progress value={percentage} className="flex-1 h-2" />
              <span className="w-8 text-right text-muted-foreground text-xs">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Separator className="mb-4" />

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">
          No reviews yet. Be the first to review this product!
        </p>
      ) : (
        <div className="space-y-4">
          {displayedReviews.map((review) => (
            <div key={review.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Customer</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < review.rating
                          ? "fill-warning text-warning"
                          : "fill-muted text-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
              {review.title && (
                <p className="font-medium text-sm text-foreground">{review.title}</p>
              )}
              {review.comment && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {review.comment}
                </p>
              )}
              <Separator />
            </div>
          ))}

          {reviews.length > 3 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Show Less" : `View All ${reviews.length} Reviews`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
