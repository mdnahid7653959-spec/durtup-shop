import { useState } from "react";
import { supabase } from "@/lib/firebaseAdapter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type PaymentProvider = "bkash" | "nagad" | "rocket" | "sslcommerz";

interface PaymentInitResult {
  success: boolean;
  redirect_url?: string;
  payment?: Record<string, unknown>;
  error?: string;
}

interface PaymentVerifyResult {
  success: boolean;
  verified: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export function usePayment() {
  const [loading, setLoading] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();

  const initiatePayment = async (
    provider: PaymentProvider,
    orderId: string
  ): Promise<PaymentInitResult | null> => {
    if (!session?.access_token) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please login to make a payment"
      });
      return null;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("payment-gateway", {
        body: {
          action: "initiate",
          provider,
          order_id: orderId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        toast({
          variant: "destructive",
          title: "Payment initiation failed",
          description: data.message || data.error
        });
        return { success: false, error: data.error };
      }

      return data;
    } catch (error: any) {
      console.error("Payment initiation error:", error);
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: error.message || "Failed to initiate payment"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (
    provider: PaymentProvider,
    orderId: string,
    transactionId: string
  ): Promise<PaymentVerifyResult | null> => {
    if (!session?.access_token) {
      return null;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("payment-gateway", {
        body: {
          action: "verify",
          provider,
          order_id: orderId,
          transaction_id: transactionId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        toast({
          title: "Payment verified",
          description: "Your payment has been confirmed"
        });
      } else {
        toast({
          variant: "destructive",
          title: "Payment verification failed",
          description: data.message || "Could not verify payment"
        });
      }

      return data;
    } catch (error: any) {
      console.error("Payment verification error:", error);
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "Failed to verify payment"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    initiatePayment,
    verifyPayment
  };
}
