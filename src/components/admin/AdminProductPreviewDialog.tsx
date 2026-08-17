import { useEffect, useState } from "react";
import { supabase } from "@/lib/firebaseAdapter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, Ban, Loader2, Package, Store, Tag } from "lucide-react";
import { getCachedMohasagorProducts } from "@/utils/mohasagorCache";

interface Props {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onBan?: (id: string) => void;
  actionLoading?: boolean;
}

export function AdminProductPreviewDialog({
  productId, open, onOpenChange, onApprove, onReject, onBan, actionLoading,
}: Props) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (!productId || !open) return;
    setLoading(true);
    setSelectedImage(0);
    (async () => {
      let foundData: any = null;
      try {
        const { data } = await supabase
          .from("products")
          .select(`
            *,
            product_images(id, image_url, sort_order),
            categories:category_id(name, slug),
            brands:brand_id(name, logo_url)
          `)
          .eq("id", productId)
          .maybeSingle();
        foundData = data;
      } catch (err) {
        console.warn("Preview fetch error:", err);
      }

      if (foundData) {
        // If Supabase returned product without images, check local storage for images
        const hasImgs = (Array.isArray(foundData.product_images) && foundData.product_images.length > 0) || foundData.image_url || foundData.image;
        if (!hasImgs) {
          try {
            const rawLocal = localStorage.getItem("enterprise_admin_products") || localStorage.getItem("local_products");
            if (rawLocal) {
              const list = JSON.parse(rawLocal);
              if (Array.isArray(list)) {
                const matched = list.find((p: any) => p.id === productId || p.slug === productId);
                if (matched && (matched.images || matched.product_images || matched.image_url || matched.image)) {
                  foundData.product_images = matched.product_images || matched.images || [];
                  foundData.image_url = matched.image_url || matched.image || foundData.image_url;
                  foundData.images = matched.images || foundData.images;
                }
              }
            }
          } catch {}
        }
      }

      if (!foundData) {
        try {
          const rawLocal = localStorage.getItem("enterprise_admin_products") || localStorage.getItem("local_products");
          if (rawLocal) {
            const list = JSON.parse(rawLocal);
            if (Array.isArray(list)) {
              const matched = list.find((p: any) => p.id === productId || p.slug === productId);
              if (matched) {
                const rawImgs = Array.isArray(matched.images) && matched.images.length > 0
                  ? matched.images
                  : (Array.isArray(matched.product_images) && matched.product_images.length > 0
                      ? matched.product_images
                      : [matched.image_url || matched.image || "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop"]);
                foundData = {
                  id: matched.id,
                  name: matched.name || matched.title || "Product Preview",
                  slug: matched.slug || "preview-slug",
                  regular_price: Number(matched.regular_price || matched.price || 0),
                  discount_price: matched.discount_price ? Number(matched.discount_price) : null,
                  short_description: matched.short_description || matched.shortDescription || null,
                  description: matched.description || "High quality store product preview.",
                  stock_quantity: Number(matched.stock_quantity || matched.stock || 50),
                  status: matched.status || "APPROVED",
                  approval_status: matched.approval_status || matched.approvalStatus || "APPROVED",
                  seller_id: matched.seller_id || "admin",
                  product_images: rawImgs.map((u: any, i: number) => ({
                    id: `img-${i}`,
                    image_url: typeof u === "string" ? u : (u?.image_url || u?.url || u?.image || u?.product_image || ""),
                    sort_order: i
                  })),
                  categories: { name: matched.category_name || matched.category || "General", slug: matched.category_slug || "general" }
                };
              }
            }
          }
        } catch (localErr) {
          console.warn("Preview local fallback warning:", localErr);
        }
      }

      if (!foundData) {
        try {
          const mohasagorList = await getCachedMohasagorProducts();
          if (mohasagorList && mohasagorList.length > 0) {
            const matched: any = mohasagorList.find((p: any) =>
              String(p.id) === String(productId) ||
              p.slug === productId ||
              p.sku === productId ||
              String(p.product_code) === String(productId) ||
              `product-${p.id}` === productId
            );
            if (matched) {
              const rawImgs = Array.isArray(matched.product_images) && matched.product_images.length > 0
                ? matched.product_images
                : (Array.isArray(matched.images) && matched.images.length > 0
                    ? matched.images.map((u: string, i: number) => ({ id: `img-${i}`, image_url: u, sort_order: i }))
                    : [{ id: "img-0", image_url: matched.image || "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop", sort_order: 0 }]);

              foundData = {
                id: matched.id,
                name: matched.name || "API Product",
                slug: matched.slug || `product-${matched.id}`,
                regular_price: Number(matched.originalPrice || matched.price || 0),
                discount_price: matched.originalPrice ? Number(matched.price) : null,
                short_description: matched.short_description || null,
                description: matched.details || matched.description || "API Supplier Product",
                stock_quantity: Number(matched.stock_quantity ?? matched.stock ?? (matched.stock_status === "available" ? 50 : 0)),
                sku: matched.sku || (matched.product_code ? String(matched.product_code) : `API-${matched.id}`),
                status: "active",
                approval_status: "APPROVED",
                seller_id: "Mohasagor Supplier",
                product_images: rawImgs,
                categories: { name: matched.category || "Supplier API", slug: "supplier" }
              };
            }
          }
        } catch (suppErr) {
          console.warn("Preview supplier fallback warning:", suppErr);
        }
      }

      if (!foundData) {
        foundData = {
          id: productId,
          name: "Product Preview",
          slug: "preview-product",
          regular_price: 0,
          discount_price: null,
          description: "Product preview information",
          stock_quantity: 10,
          status: "APPROVED",
          approval_status: "APPROVED",
          product_images: [{ id: "img-0", image_url: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop", sort_order: 0 }]
        };
      }

      setProduct(foundData);
      setLoading(false);
    })();
  }, [productId, open]);


  const defaultPlaceholderSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600' fill='%23f8fafc'><rect width='600' height='600' rx='30'/><g transform='translate(250, 240)' fill='none' stroke='%2394a3b8' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'><rect x='10' y='20' width='80' height='70' rx='10'/><circle cx='35' cy='45' r='10'/><path d='M10 75 l25-25 l20 20 l25-25 l10 10'/></g><text x='300' y='360' font-family='sans-serif' font-size='20' font-weight='600' fill='%2364748b' text-anchor='middle'>No Image Uploaded</text></svg>";
  const defaultFallbackImage = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop";

  const resolvePreviewImage = (url: any): string => {
    if (!url || typeof url !== "string") return "";
    const trimmed = url.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
      return trimmed;
    }
    if (trimmed.startsWith("//")) return `https:${trimmed}`;
    if (trimmed.includes("prod_") || (!trimmed.startsWith("/") && !trimmed.startsWith("assets/"))) {
      return "";
    }
    const base = "https://mohasagor.com.bd";
    return trimmed.startsWith("/") ? `${base}${trimmed}` : `${base}/${trimmed}`;
  };

  const extractImages = (p: any): string[] => {
    if (!p) return [];
    const list: string[] = [];
    const addUrl = (u: any) => {
      const res = resolvePreviewImage(u);
      if (res && !list.includes(res)) list.push(res);
    };

    if (Array.isArray(p.product_images) && p.product_images.length > 0) {
      p.product_images.forEach((item: any) => {
        if (typeof item === "string") addUrl(item);
        else if (item && typeof item === "object") {
          addUrl(item.image_url || item.url || item.image || item.product_image);
        }
      });
    }

    if (Array.isArray(p.images) && p.images.length > 0) {
      p.images.forEach((item: any) => {
        if (typeof item === "string") addUrl(item);
        else if (item && typeof item === "object") {
          addUrl(item.image_url || item.url || item.image);
        }
      });
    }

    if (p.image_url) addUrl(p.image_url);
    if (p.image) addUrl(p.image);
    if (p.thumbnail_img) addUrl(p.thumbnail_img);

    return list;
  };

  const images = extractImages(product);
  if (images.length === 0) {
    images.push(defaultFallbackImage);
  }

  const price = product?.discount_price ?? product?.regular_price;
  const hasDiscount = product?.discount_price && product.discount_price < product.regular_price;
  const discountPct = hasDiscount
    ? Math.round(((product.regular_price - product.discount_price) / product.regular_price) * 100)
    : 0;

  const approvalBadge = (status: string | null) => {
    const map: Record<string, string> = {
      approved: "bg-green-500/10 text-green-600 border-green-500/20",
      pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      rejected: "bg-red-500/10 text-red-600 border-red-500/20",
      banned: "bg-red-500/10 text-red-600 border-red-500/20",
    };
    return <Badge className={map[status || ""] || ""}>{status || "N/A"}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Preview
          </DialogTitle>
          <DialogDescription>
            Review this product exactly as customers will see it, then approve or reject.
          </DialogDescription>
        </DialogHeader>

        {loading || !product ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(92vh-180px)]">
            <div className="p-6 grid md:grid-cols-2 gap-6">
              {/* Gallery */}
              <div className="space-y-3">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                  {images.length > 0 ? (
                    <img
                      src={images[selectedImage] || defaultFallbackImage}
                      alt={product.name}
                      className="w-full h-full object-contain p-4"
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = defaultFallbackImage; }}
                    />
                  ) : (
                    <div className="text-muted-foreground text-sm">No images uploaded</div>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((img: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(i)}
                        className={`flex-shrink-0 w-16 h-16 rounded-md border-2 overflow-hidden ${
                          selectedImage === i ? "border-primary" : "border-transparent"
                        }`}
                      >
                        <img
                          src={img || defaultFallbackImage}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = defaultFallbackImage; }}
                        />
                      </button>
                    ))}
                  </div>
                )}
                {product.video_url && (
                  <div className="rounded-lg overflow-hidden border">
                    <video src={product.video_url} controls className="w-full" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {approvalBadge(product.approval_status)}
                  <Badge variant="outline">{product.status}</Badge>
                  {product.seller_id ? (
                    <Badge variant="outline" className="text-xs"><Store className="h-3 w-3 mr-1" />Seller</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Admin</Badge>
                  )}
                  {product.is_featured && <Badge className="bg-primary/10 text-primary">Featured</Badge>}
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-foreground">{product.name}</h2>
                  {product.brands?.name && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Brand: <span className="font-medium text-foreground">{product.brands.name}</span>
                    </p>
                  )}
                  {product.categories?.name && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Tag className="h-3 w-3" /> {product.categories.name}
                    </p>
                  )}
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-primary">৳{Number(price).toLocaleString()}</span>
                  {hasDiscount && (
                    <>
                      <span className="text-lg text-muted-foreground line-through">
                        ৳{Number(product.regular_price).toLocaleString()}
                      </span>
                      <Badge className="bg-red-500 text-white">-{discountPct}%</Badge>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm bg-muted/40 p-3 rounded-lg">
                  <div>
                    <div className="text-muted-foreground">Stock</div>
                    <div className="font-medium">{product.stock_quantity ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">SKU</div>
                    <div className="font-medium">{product.sku || "—"}</div>
                  </div>
                  {product.weight && (
                    <div>
                      <div className="text-muted-foreground">Weight</div>
                      <div className="font-medium">{product.weight} kg</div>
                    </div>
                  )}
                  {product.slug && (
                    <div className="col-span-2">
                      <div className="text-muted-foreground">Slug</div>
                      <div className="font-mono text-xs break-all">{product.slug}</div>
                    </div>
                  )}
                </div>

                {product.short_description && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Short Description</h4>
                    <p className="text-sm text-muted-foreground">{product.short_description}</p>
                  </div>
                )}

                {product.description && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Description</h4>
                    {/<[a-z][\s\S]*>/i.test(product.description) ? (
                      <div
                        className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none
                          [&_img]:max-w-full [&_img]:rounded-lg [&_table]:w-full [&_table]:border-collapse
                          [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2
                          [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                        dangerouslySetInnerHTML={{ __html: product.description }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{product.description}</p>
                    )}
                  </div>
                )}

                {product.specifications && Object.keys(product.specifications).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Specifications</h4>
                    <div className="border rounded-lg divide-y">
                      {Object.entries(product.specifications).map(([k, v]) => (
                        <div key={k} className="flex text-sm px-3 py-2">
                          <span className="w-1/3 text-muted-foreground capitalize">{k}</span>
                          <span className="flex-1 font-medium">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {product.return_policy && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Return & Refund Policy</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{product.return_policy}</p>
                  </div>
                )}

                {product.rejection_reason && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="text-sm font-semibold text-red-600 mb-1">Rejection Reason</div>
                    <p className="text-sm text-red-600/90">{product.rejection_reason}</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}

        {/* Footer actions */}
        {product && (
          <div className="border-t px-6 py-3 flex flex-wrap gap-2 justify-end bg-muted/30">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            {product.approval_status === "pending" && (
              <>
                <Button
                  variant="outline"
                  className="text-orange-600 border-orange-500/40 hover:bg-orange-500/10"
                  disabled={actionLoading}
                  onClick={() => onReject?.(product.id)}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={actionLoading}
                  onClick={() => onApprove?.(product.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" /> Approve
                </Button>
              </>
            )}
            {product.approval_status !== "banned" && product.seller_id && (
              <Button
                variant="outline"
                className="text-red-600 border-red-500/40 hover:bg-red-500/10"
                disabled={actionLoading}
                onClick={() => onBan?.(product.id)}
              >
                <Ban className="h-4 w-4 mr-2" /> Ban
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
