import { Navigate } from "react-router-dom";
import { useStaff } from "@/contexts/StaffContext";
import StaffDashboard from "./StaffDashboard";
import { Loader2 } from "lucide-react";

export default function StaffIndex() {
  const { loading, isStaff } = useStaff();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!isStaff) return <Navigate to="/staff/login" replace />;
  return <StaffDashboard />;
}
