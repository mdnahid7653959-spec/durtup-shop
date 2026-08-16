import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { usePayment } from "@/hooks/usePayment";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyPayment, loading } = usePayment();
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [message, setMessage] = useState("");

  const provider = searchParams.get("provider") as "bkash" | "nagad" | "rocket" | "sslcommerz";
  const orderId = searchParams.get("order_id");
  const paymentId = searchParams.get("paymentID") || searchParams.get("payment_ref_id");
  const paymentStatus = searchParams.get("status");

  useEffect(() => {
    const verify = async () => {
      if (!provider || !orderId) {
        setStatus("failed");
        setMessage("Invalid callback parameters");
        return;
      }

      // Check if payment was cancelled by user
      if (paymentStatus === "cancel" || paymentStatus === "failure") {
        setStatus("failed");
        setMessage("Payment was cancelled or failed");
        return;
      }

      if (!paymentId) {
        setStatus("failed");
        setMessage("No payment reference found");
        return;
      }

      const result = await verifyPayment(provider, orderId, paymentId);

      if (result?.verified) {
        setStatus("success");
        setMessage("Your payment has been successfully verified!");
      } else {
        setStatus("failed");
        setMessage(result?.message || "Payment verification failed");
      }
    };

    verify();
  }, [provider, orderId, paymentId, paymentStatus]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-12 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Payment Verification</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {(status === "verifying" || loading) && (
              <>
                <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Verifying your payment...</p>
                <p className="text-sm text-muted-foreground">Please wait while we confirm your payment</p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-2">
                    Payment Successful!
                  </h3>
                  <p className="text-muted-foreground">{message}</p>
                </div>
                <Button onClick={() => navigate("/orders")} className="w-full">
                  View My Orders
                </Button>
              </>
            )}

            {status === "failed" && !loading && (
              <>
                <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
                  <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
                    Payment Failed
                  </h3>
                  <p className="text-muted-foreground">{message}</p>
                </div>
                <div className="space-y-2">
                  <Button onClick={() => navigate("/orders")} className="w-full">
                    View Orders
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                    Continue Shopping
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
