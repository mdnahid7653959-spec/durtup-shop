import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Heart, ShoppingCart, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/firebaseAdapter";

interface WishlistItem {
  id: string;
  product_id: string;
  created_at: string;
  product: {
    id: string;
    name: string;
    slug: string;
    regular_price: number;
    discount_price: number | null;
    stock_quantity: number | null;
  } | null;
  product_image: string | null;
}

export default function Wishlist() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchWishlist();
    }
  }, [user]);

  const fetchWishlist = async () => {
    try {
      const { data, error } = await supabase
        .from("wishlist")
        .select(`
          id,
          product_id,
          created_at,
          product:products (
            id,
            name,
            slug,
            regular_price,
            discount_price,
            stock_quantity
          )
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch product images separately
      const itemsWithImages = await Promise.all(
        (data || []).map(async (item: any) => {
          if (item.product) {
            const { data: imageData } = await supabase
              .from("product_images")
              .select("image_url")
              .eq("product_id", item.product_id)
              .eq("is_primary", true)
              .single();
            
            return {
              ...item,
              product_image: imageData?.image_url || null
            };
          }
          return { ...item, product_image: null };
        })
      );

      setWishlistItems(itemsWithImages);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  const removeFromWishlist = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("wishlist")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      setWishlistItems(prev => prev.filter(item => item.id !== itemId));
      toast({
        title: "Removed from wishlist",
        description: "Item has been removed from your wishlist."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const addToCart = async (productId: string) => {
    try {
      // Check if item already in cart
      const { data: existingItem } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", user?.id)
        .eq("product_id", productId)
        .single();

      if (existingItem) {
        // Update quantity
        await supabase
          .from("cart_items")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);
      } else {
        // Add new item
        await supabase
          .from("cart_items")
          .insert({
            user_id: user?.id,
            product_id: productId,
            quantity: 1
          });
      }

      toast({
        title: "Added to cart!",
        description: "Item has been added to your cart."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  const filteredItems = wishlistItems.filter(item =>
    item.product?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">My Wishlist</h1>
              <p className="text-muted-foreground mt-1">
                {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved
              </p>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search wishlist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loadingItems ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading wishlist...
            </div>
          ) : filteredItems.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Heart className="w-20 h-20 mx-auto text-muted-foreground mb-6" />
                <h3 className="text-xl font-semibold mb-2">Your wishlist is empty</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Save items you love by clicking the heart icon on any product. They'll appear here for easy access later.
                </p>
                <Button asChild size="lg">
                  <Link to="/products">Explore Products</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item) => (
                <Card key={item.id} className="group overflow-hidden">
                  <div className="relative aspect-square bg-muted">
                    {item.product_image ? (
                      <img
                        src={item.product_image}
                        alt={item.product?.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Heart className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                    {item.product?.discount_price && (
                      <Badge className="absolute top-3 left-3 bg-sale text-sale-foreground">
                        {Math.round((1 - item.product.discount_price / item.product.regular_price) * 100)}% OFF
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <Link to={`/product/${item.product?.slug}`}>
                      <h3 className="font-medium line-clamp-2 hover:text-primary transition-colors">
                        {item.product?.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mt-2">
                      {item.product?.discount_price ? (
                        <>
                          <span className="font-bold text-lg text-primary">
                            ৳{item.product.discount_price.toFixed(2)}
                          </span>
                          <span className="text-sm text-muted-foreground line-through">
                            ৳{item.product.regular_price.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span className="font-bold text-lg">
                          ৳{item.product?.regular_price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        onClick={() => item.product && addToCart(item.product.id)}
                        className="flex-1"
                        size="sm"
                        disabled={!item.product?.stock_quantity}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {item.product?.stock_quantity ? 'Add to Cart' : 'Out of Stock'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
