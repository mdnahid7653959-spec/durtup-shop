import { Star, MessageSquare, Package, Calendar, ShieldCheck, Loader2, Store } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/firebaseAdapter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface StoreDetailsProps {
  sellerId: string;
  onContactSeller: () => void;
  contactingSeller: boolean;
}

interface ResolvedSeller {
  seller_id: string;
  user_id: string;
  shop_name: string | null;
  shop_logo: string | null;
  shop_description: string | null;
  rating_average: number | null;
  rating_count: number | null;
  total_products: number | null;
  is_featured: boolean | null;
  created_at: string | null;
}

export function StoreDetails({ sellerId, onContactSeller, contactingSeller }: StoreDetailsProps) {
  const { data: store, isLoading } = useQuery<ResolvedSeller | null>({
    queryKey: ["store-details", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("resolve_product_seller", {
        _product_seller_id: sellerId,
      });

      if (error) {
        console.error("Store resolve error:", error);
        return null;
      }

      const seller = Array.isArray(data) ? data[0] : data;
      return (seller as ResolvedSeller) ?? null;
    },
    enabled: !!sellerId,
  });

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border p-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-muted" />
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  const joinDate = store?.created_at
    ? new Date(store.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short" })
    : null;

  const storeName = store?.shop_name || "Durtup Official";

  return (
    <div className="bg-card rounded-2xl border p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold text-foreground mb-4">Store Information</h3>

      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
          {store?.shop_logo ? (
            <img src={store.shop_logo} alt={storeName} className="w-full h-full object-cover" />
          ) : (
            <Store className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-foreground text-base truncate">{storeName}</h4>
            {(store?.is_featured ?? true) && (
              <Badge variant="secondary" className="text-xs gap-1">
                <ShieldCheck className="h-3 w-3" /> Verified
              </Badge>
            )}
          </div>
          {store?.rating_average != null ? (
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              <span className="text-sm font-medium text-foreground">{Number(store.rating_average).toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({store.rating_count || 0} ratings)</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">Trusted marketplace seller</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 bg-muted/50 rounded-xl">
          <Package className="h-4 w-4 mx-auto text-primary mb-1" />
          <p className="text-sm font-semibold text-foreground">{store?.total_products ?? "-"}</p>
          <p className="text-xs text-muted-foreground">Products</p>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-xl">
          <Star className="h-4 w-4 mx-auto text-warning mb-1" />
          <p className="text-sm font-semibold text-foreground">
            {store?.rating_average != null ? Number(store.rating_average).toFixed(1) : "N/A"}
          </p>
          <p className="text-xs text-muted-foreground">Rating</p>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-xl">
          <Calendar className="h-4 w-4 mx-auto text-primary mb-1" />
          <p className="text-sm font-semibold text-foreground">{joinDate || "N/A"}</p>
          <p className="text-xs text-muted-foreground">Joined</p>
        </div>
      </div>

      {store?.shop_description && (
        <>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{store.shop_description}</p>
          <Separator className="mb-4" />
        </>
      )}

      <Button className="w-full gap-2" onClick={onContactSeller} disabled={contactingSeller}>
        {contactingSeller ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
        Chat with Seller
      </Button>
    </div>
  );
}
