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
  canApprove?: boolean;
}

export function StaffProductPreviewDialog({
  productId, open, onOpenChange, onApprove, onReject, onBan, actionLoading, canApprove,
}: Props) {
  const [product, setProduct] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [seller, setSeller] = useState<any>(null);
  const [category, setCategory] = useState<any>(null);
  const [brand, setBrand] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (!productId || !open) return;
    setLoading(true);
    setSelectedImage(0);
    (async () => {
      let foundProd: any = null;
      let foundImgs: any[] = [];
      let foundCat: any = null;
      let foundBrand: any = null;
      let foundSeller: any = null;

      try {
        const { data, error } = await supabase.functions.invoke("staff-products", {
          body: { action: "get", productId },
        });
        if (!error && data && !data.error && data.product) {
          foundProd = data.product;
          foundImgs = data.images || [];
          foundSeller = data.seller;
          foundCat = data.category;
          foundBrand = data.brand;
        }
      } catch (err) {
        console.warn("Staff preview edge function warning:", err);
      }

      if (!foundProd) {
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
              foundProd = {
                id: matched.id,
                name: matched.name,
                slug: matched.slug || `product-${matched.id}`,
                regular_price: Number(matched.originalPrice || matched.price || 0),
                discount_price: matched.originalPrice ? Number(matched.price) : null,
                short_description: matched.short_description || null,
                description: matched.details || matched.description || "API Supplier Product",
                stock_quantity: Number(matched.stock_quantity ?? matched.stock ?? (matched.stock_status === "available" ? 50 : 0)),
                sku: matched.sku || (matched.product_code ? String(matched.product_code) : `API-${matched.id}`),
                status: "active",
                approval_status: "APPROVED",
                seller_id: "Mohasagor Supplier"
              };
              foundImgs = (matched.product_images || []).map((img: any, i: number) => ({
                id: `img-${i}`,
                image_url: typeof img === "string" ? img : (img.image_url || img.product_image || img.image || matched.image),
                sort_order: i
              }));
              if (foundImgs.length === 0 && matched.image) {
                foundImgs = [{ id: "img-0", image_url: matched.image, sort_order: 0 }];
              }
              foundCat = { name: matched.category || "Supplier API" };
              foundSeller = { shop_name: "Mohasagor Supplier" };
            }
          }
        } catch (suppErr) {
          console.warn("Staff preview supplier fallback warning:", suppErr);
        }
      }

      setProduct(foundProd);
      setImages(foundImgs);
      setSeller(foundSeller);
      setCategory(foundCat);
      setBrand(foundBrand);
      setLoading(false);
    })();
  }, [productId, open]);

  const imgUrls = (images || [])
    .slice()
    .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((img: any) => img.image_url);

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
              <div className="space-y-3">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                  {imgUrls.length > 0 ? (
                    <img src={imgUrls[selectedImage]} alt={product.name} className="w-full h-full object-contain p-4" />
                  ) : (
                    <div className="text-muted-foreground text-sm">No images uploaded</div>
                  )}
                </div>
                {imgUrls.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {imgUrls.map((img: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(i)}
                        className={`flex-shrink-0 w-16 h-16 rounded-md border-2 overflow-hidden ${
                          selectedImage === i ? "border-primary" : "border-transparent"
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
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
                  {brand?.name && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Brand: <span className="font-medium text-foreground">{brand.name}</span>
                    </p>
                  )}
                  {category?.name && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Tag className="h-3 w-3" /> {category.name}
                    </p>
                  )}
                  {seller?.shop_name && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Shop: <span className="font-medium text-foreground">{seller.shop_name}</span>
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

                {(seller?.business_email || seller?.business_phone) && (
                  <div className="p-3 rounded-lg bg-muted/40 border">
                    <div className="text-sm font-semibold mb-1">Seller Contact</div>
                    {seller.business_email && <p className="text-xs text-muted-foreground">Email: {seller.business_email}</p>}
                    {seller.business_phone && <p className="text-xs text-muted-foreground">Phone: {seller.business_phone}</p>}
                    {seller.status && <p className="text-xs text-muted-foreground">Status: {seller.status}</p>}
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

        {product && canApprove && (
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
