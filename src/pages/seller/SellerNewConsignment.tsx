import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/firebaseAdapter";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, ChevronsUpDown, Loader2, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number | null;
}

interface Warehouse {
  id: string;
  name: string;
  address: {
    city?: string;
    area?: string;
  } | null;
}

export default function SellerNewConsignment() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [productOpen, setProductOpen] = useState(false);

  // Get seller
  const { data: seller } = useQuery({
    queryKey: ["seller", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("sellers")
        .select("id, status")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch seller's products (products.seller_id references profiles.id, not sellers.id)
  const { data: sellerProfile } = useQuery({
    queryKey: ["seller-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["seller-products", sellerProfile?.id],
    queryFn: async () => {
      if (!sellerProfile?.id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, stock_quantity")
        .eq("seller_id", sellerProfile.id)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!sellerProfile?.id,
  });

  // Fetch all active warehouses so the seller can pick the nearest one
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name, address, city")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as any as Warehouse[];
    },
  });

  // Auto-preselect first warehouse if none chosen yet
  useEffect(() => {
    if (!selectedWarehouse && warehouses.length > 0) {
      setSelectedWarehouse(warehouses[0].id);
    }
  }, [warehouses, selectedWarehouse]);
  const lockedWarehouse = warehouses.find((w) => w.id === selectedWarehouse) || warehouses[0];

  // Create consignment mutation
  const createConsignment = useMutation({
    mutationFn: async () => {
      const warehouseId = selectedWarehouse || lockedWarehouse?.id;
      if (!seller?.id || !selectedProduct || !warehouseId || !quantity) {
        throw new Error("Please fill all required fields");
      }

      const { error } = await supabase.from("consignments").insert([{
        consignment_number: `CON-${Date.now()}`,
        seller_id: seller.id,
        product_id: selectedProduct.id,
        warehouse_id: warehouseId,
        quantity: parseInt(quantity),
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Consignment Created",
        description: "Your consignment request has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["seller-consignments"] });
      navigate("/seller/consignments");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      toast({ title: "Error", description: "Please select a product", variant: "destructive" });
      return;
    }
    const warehouseId = selectedWarehouse || lockedWarehouse?.id;
    if (!warehouseId) {
      toast({ title: "Error", description: "Warehouse is loading, please wait a moment", variant: "destructive" });
      return;
    }
    if (!selectedWarehouse && lockedWarehouse) {
      setSelectedWarehouse(lockedWarehouse.id);
    }
    if (!quantity || parseInt(quantity) <= 0) {
      toast({ title: "Error", description: "Please enter a valid quantity", variant: "destructive" });
      return;
    }

    createConsignment.mutate();
  };

  return (
    <SellerLayout title="New Consignment">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/seller/consignments")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Consignment</h1>
            <p className="text-muted-foreground">
              Submit a new consignment request to warehouse
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Consignment Details
            </CardTitle>
            <CardDescription>
              Select the product and quantity you want to send to the warehouse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Selection */}
              <div className="space-y-2">
                <Label>Product *</Label>
                <Popover open={productOpen} onOpenChange={setProductOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={productOpen}
                      className="w-full justify-between"
                    >
                      {selectedProduct ? (
                        <span className="truncate">{selectedProduct.name}</span>
                      ) : (
                        "Select product..."
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search products..." />
                      <CommandList>
                        <CommandEmpty>No products found.</CommandEmpty>
                        <CommandGroup>
                          {products.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.name}
                              onSelect={() => {
                                setSelectedProduct(product);
                                setProductOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedProduct?.id === product.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div className="flex-1">
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  SKU: {product.sku || "N/A"} • Stock: {product.stock_quantity || 0}
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedProduct && (
                  <p className="text-sm text-muted-foreground">
                    Available stock: {selectedProduct.stock_quantity || 0} units
                  </p>
                )}
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              {/* Warehouse selector — seller picks the nearest one */}
              <div className="space-y-2">
                <Label htmlFor="warehouse">Warehouse *</Label>
                <Select
                  value={selectedWarehouse}
                  onValueChange={setSelectedWarehouse}
                >
                  <SelectTrigger id="warehouse">
                    <SelectValue placeholder="Select nearest warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{w.name}</span>
                          {(w.address as any)?.city || (w as any).city ? (
                            <span className="text-xs text-muted-foreground">
                              {(w as any).city || (w.address as any)?.city}
                            </span>
                          ) : null}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose the warehouse nearest to you for faster delivery.
                </p>
              </div>


              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/seller/consignments")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createConsignment.isPending}
                  className="flex-1"
                >
                  {createConsignment.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Consignment"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">How it works</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Select the product you want to send to warehouse</li>
              <li>Enter the quantity you're sending</li>
              <li>Choose the destination warehouse</li>
              <li>Submit your request - status will be "Pending"</li>
              <li>Admin will review and approve/reject your request</li>
              <li>Once approved, you can ship the products to the warehouse</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </SellerLayout>
  );
}
