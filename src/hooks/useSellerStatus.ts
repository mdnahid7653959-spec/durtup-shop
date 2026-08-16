import { useState, useEffect } from "react";
import { supabase } from "@/lib/firebaseAdapter";
import { useAuth } from "@/contexts/AuthContext";

export type SellerStatus = "none" | "pending" | "approved" | "rejected" | "suspended" | "banned";

interface SellerInfo {
  id: string;
  shop_name: string;
  status: SellerStatus;
}

export function useSellerStatus() {
  const { user } = useAuth();
  const [sellerInfo, setSellerInfo] = useState<SellerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SellerStatus>("none");

  useEffect(() => {
    const fetchSellerStatus = async () => {
      if (!user) {
        setLoading(false);
        setStatus("none");
        setSellerInfo(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("sellers")
          .select("id, shop_name, status")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching seller status:", error);
          setStatus("none");
          setSellerInfo(null);
        } else if (data) {
          setStatus(data.status as SellerStatus);
          setSellerInfo({
            id: data.id,
            shop_name: data.shop_name,
            status: data.status as SellerStatus,
          });
        } else {
          setStatus("none");
          setSellerInfo(null);
        }
      } catch (err) {
        console.error("Error in useSellerStatus:", err);
        setStatus("none");
      } finally {
        setLoading(false);
      }
    };

    fetchSellerStatus();

    // Set up real-time subscription
    if (user) {
      const channel = supabase
        .channel("seller-status-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "sellers",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("Seller status changed:", payload);
            fetchSellerStatus();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  return {
    status,
    sellerInfo,
    loading,
    isApprovedSeller: status === "approved",
    isPendingSeller: status === "pending",
    hasApplied: status !== "none",
  };
}
