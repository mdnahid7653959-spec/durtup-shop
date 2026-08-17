import { useState } from "react";
import { supabase } from "@/lib/firebaseAdapter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface OrderItem {
  product_id: string;
  variant_id?: string;
  quantity: number;
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state?: string;
  zipCode: string;
  country: string;
  phone: string;
}

interface CreateOrderParams {
  items: OrderItem[];
  shipping_address: ShippingAddress;
  payment_method: string;
  coupon_code?: string;
}

interface OrderResult {
  id: string;
  order_number: string;
  total: number;
  payment_method: string;
  status: string;
}

export function useOrderProcessing() {
  const [loading, setLoading] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();

  const createOrder = async (params: CreateOrderParams): Promise<OrderResult | null> => {
    if (!session?.access_token) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please login to place an order"
      });
      return null;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("process-order", {
        body: {
          action: "create",
          ...params
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Order placed successfully!",
        description: `Your order #${data.order.order_number} has been confirmed.`
      });

      return data.order;
    } catch (error: any) {
      console.error("Order error:", error);
      toast({
        variant: "destructive",
        title: "Failed to place order",
        description: error.message || "Something went wrong"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getOrder = async (orderId: string) => {
    if (!session?.access_token) {
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke("process-order", {
        body: {
          action: "get",
          order_id: orderId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error || data.error) {
        return null;
      }

      return data.order;
    } catch {
      return null;
    }
  };

  return {
    loading,
    createOrder,
    getOrder
  };
}
