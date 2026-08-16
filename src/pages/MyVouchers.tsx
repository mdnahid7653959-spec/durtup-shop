import { useState, useEffect } from "react";
import { ArrowLeft, Ticket, Clock, Check, X, Loader2, Copy, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/firebaseAdapter";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface UserVoucher {
  id: string;
  status: string;
  collected_at: string;
  used_at: string | null;
  coupon: {
    id: string;
    code: string;
    description: string | null;
    discount_type: string;
    discount_value: number;
    min_order_amount: number | null;
    max_discount_amount: number | null;
    end_date: string | null;
  };
}

export default function MyVouchers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<UserVoucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchVouchers = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("user_vouchers")
          .select(`
            id,
            status,
            collected_at,
            used_at,
            coupon:coupon_id (
              id,
              code,
              description,
              discount_type,
              discount_value,
              min_order_amount,
              max_discount_amount,
              end_date
            )
          `)
          .eq("user_id", user.id)
          .order("collected_at", { ascending: false });

        if (error) throw error;
        setVouchers((data as any) || []);
      } catch (error) {
        console.error("Error fetching vouchers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVouchers();
  }, [user]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: "Copied!", description: `Code ${code} copied to clipboard` });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const availableVouchers = vouchers.filter(v => v.status === "available");
  const usedVouchers = vouchers.filter(v => v.status === "used");
  const expiredVouchers = vouchers.filter(v => v.status === "expired");

  const VoucherCard = ({ voucher }: { voucher: UserVoucher }) => {
    const { coupon } = voucher;
    const isExpired = voucher.status === "expired" || (coupon.end_date && new Date(coupon.end_date) < new Date());
    const isUsed = voucher.status === "used";

    const discountText = coupon.discount_type === "percentage"
      ? `${coupon.discount_value}% OFF`
      : `৳${coupon.discount_value} OFF`;

    return (
      <Card className={cn("overflow-hidden", (isExpired || isUsed) && "opacity-60")}>
        <CardContent className="p-0">
          <div className="flex">
            {/* Left accent */}
            <div className={cn(
              "w-2 flex-shrink-0",
              isUsed ? "bg-muted-foreground" : isExpired ? "bg-destructive" : "bg-primary"
            )} />
            
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-xl font-bold text-primary">{discountText}</p>
                  {coupon.max_discount_amount && coupon.discount_type === "percentage" && (
                    <p className="text-xs text-muted-foreground">
                      Max ৳{coupon.max_discount_amount}
                    </p>
                  )}
                </div>
                {isUsed ? (
                  <Badge variant="secondary" className="gap-1">
                    <Check className="h-3 w-3" />
                    Used
                  </Badge>
                ) : isExpired ? (
                  <Badge variant="destructive" className="gap-1">
                    <X className="h-3 w-3" />
                    Expired
                  </Badge>
                ) : (
                  <Badge className="gap-1 bg-primary/10 text-primary">
                    <Ticket className="h-3 w-3" />
                    Available
                  </Badge>
                )}
              </div>

              {coupon.description && (
                <p className="text-sm text-muted-foreground mb-2">{coupon.description}</p>
              )}

              {coupon.min_order_amount && (
                <p className="text-xs text-muted-foreground mb-2">
                  Min. order: ৳{coupon.min_order_amount.toLocaleString()}
                </p>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-dashed">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm bg-muted px-2 py-1 rounded">
                    {coupon.code}
                  </span>
                  {!isUsed && !isExpired && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleCopyCode(coupon.code)}
                    >
                      {copiedCode === coupon.code ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                {coupon.end_date && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {isExpired ? "Expired" : `Valid till ${new Date(coupon.end_date).toLocaleDateString()}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Ticket className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-4">Please login to view your vouchers</p>
            <Button onClick={() => navigate("/login")}>Login</Button>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 pb-24 md:pb-8">
        <div className="container max-w-2xl py-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">My Vouchers</h1>
          </div>

          {/* Collect More Banner */}
          <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Collect More Vouchers</p>
                <p className="text-sm text-muted-foreground">Get exclusive discounts on your orders</p>
              </div>
              <Button size="sm">Explore</Button>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="available">
              <TabsList className="w-full grid grid-cols-3 mb-4">
                <TabsTrigger value="available" className="text-xs">
                  Available ({availableVouchers.length})
                </TabsTrigger>
                <TabsTrigger value="used" className="text-xs">
                  Used ({usedVouchers.length})
                </TabsTrigger>
                <TabsTrigger value="expired" className="text-xs">
                  Expired ({expiredVouchers.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="available" className="space-y-3">
                {availableVouchers.length === 0 ? (
                  <div className="text-center py-8">
                    <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No available vouchers</p>
                  </div>
                ) : (
                  availableVouchers.map((voucher) => (
                    <VoucherCard key={voucher.id} voucher={voucher} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="used" className="space-y-3">
                {usedVouchers.length === 0 ? (
                  <div className="text-center py-8">
                    <Check className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No used vouchers</p>
                  </div>
                ) : (
                  usedVouchers.map((voucher) => (
                    <VoucherCard key={voucher.id} voucher={voucher} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="expired" className="space-y-3">
                {expiredVouchers.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No expired vouchers</p>
                  </div>
                ) : (
                  expiredVouchers.map((voucher) => (
                    <VoucherCard key={voucher.id} voucher={voucher} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
