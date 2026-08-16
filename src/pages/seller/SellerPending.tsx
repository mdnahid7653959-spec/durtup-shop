import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/firebaseAdapter";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

type SellerStatus = "pending" | "approved" | "rejected" | "suspended" | "banned";

interface SellerApplication {
  id: string;
  shop_name: string;
  status: SellerStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export default function SellerPending() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState<SellerApplication | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    fetchApplication();
  }, [user, navigate]);

  const fetchApplication = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("sellers")
        .select("id, shop_name, status, rejection_reason, created_at, updated_at")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No application found
          navigate("/seller/register");
        }
        return;
      }

      if (data.status === "approved") {
        navigate("/seller");
        return;
      }

      setApplication(data as SellerApplication);
    } catch (error) {
      console.error("Error fetching application:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: SellerStatus) => {
    switch (status) {
      case "pending":
        return {
          icon: Clock,
          color: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
          title: "Application Under Review",
          description: "Your seller application is being reviewed by our team. This usually takes 1-3 business days.",
        };
      case "rejected":
        return {
          icon: XCircle,
          color: "bg-red-500/10 text-red-600 border-red-200",
          title: "Application Rejected",
          description: "Unfortunately, your application was not approved. You can review the reason and submit a new application.",
        };
      case "suspended":
        return {
          icon: AlertTriangle,
          color: "bg-orange-500/10 text-orange-600 border-orange-200",
          title: "Account Suspended",
          description: "Your seller account has been temporarily suspended. Please contact support for more information.",
        };
      case "banned":
        return {
          icon: XCircle,
          color: "bg-red-500/10 text-red-600 border-red-200",
          title: "Account Banned",
          description: "Your seller account has been permanently banned due to policy violations.",
        };
      default:
        return {
          icon: Clock,
          color: "bg-gray-500/10 text-gray-600 border-gray-200",
          title: "Unknown Status",
          description: "Please contact support for more information.",
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!application) {
    return null;
  }

  const statusInfo = getStatusInfo(application.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-12">
        <div className="max-w-2xl mx-auto">
          <Card className={`border-2 ${statusInfo.color}`}>
            <CardHeader className="text-center pb-4">
              <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${statusInfo.color}`}>
                <StatusIcon className="h-10 w-10" />
              </div>
              <CardTitle className="text-2xl">{statusInfo.title}</CardTitle>
              <CardDescription className="text-base mt-2">
                {statusInfo.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Application Details */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shop Name</span>
                  <span className="font-medium">{application.shop_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span className="font-medium">
                    {new Date(application.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className={statusInfo.color}>
                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                  </Badge>
                </div>
              </div>

              {/* Rejection Reason */}
              {application.status === "rejected" && application.rejection_reason && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
                  <h4 className="font-medium text-red-700 dark:text-red-400 mb-2">Reason for Rejection</h4>
                  <p className="text-sm text-red-600 dark:text-red-300">{application.rejection_reason}</p>
                </div>
              )}

              {/* What's Next */}
              {application.status === "pending" && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                  <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">What happens next?</h4>
                  <ul className="text-sm text-blue-600 dark:text-blue-300 space-y-1">
                    <li>• Our team will review your application and documents</li>
                    <li>• You'll receive an email notification once reviewed</li>
                    <li>• If approved, you can start listing your products immediately</li>
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button variant="outline" onClick={() => navigate("/")} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
                {application.status === "pending" && (
                  <Button onClick={fetchApplication} className="flex-1">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Status
                  </Button>
                )}
                {application.status === "rejected" && (
                  <Button onClick={() => navigate("/seller/register")} className="flex-1">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Apply Again
                  </Button>
                )}
              </div>

              {/* Support */}
              <p className="text-center text-sm text-muted-foreground pt-4">
                Need help? <a href="/contact" className="text-primary hover:underline">Contact Support</a>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
