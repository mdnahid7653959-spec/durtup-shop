import { useState, useEffect } from "react";
import { supabase } from "@/lib/firebaseAdapter";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function StaffLogin() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If already signed in as staff, redirect
    (async () => {
      if (!user) return;
      const { data } = await supabase.from("staff_members").select("status").eq("user_id", user.id).maybeSingle();
      if (data?.status === "active") nav("/staff", { replace: true });
    })();
  }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const uid = data.user!.id;
      const { data: sm } = await supabase.from("staff_members").select("status").eq("user_id", uid).maybeSingle();
      if (!sm || sm.status !== "active") {
        await supabase.auth.signOut();
        throw new Error("This account is not a staff member. Contact your administrator.");
      }
      toast({ title: "Welcome back" });
      nav("/staff", { replace: true });
    } catch (err: any) {
      toast({ title: "Sign in failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/40 p-4">
      <Card className="w-full max-w-md p-6 md:p-8 space-y-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Staff Portal</h1>
          <p className="text-sm text-muted-foreground">Sign in with your verified staff account</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Sign In
          </Button>
        </form>
        <p className="text-xs text-center text-muted-foreground">
          Staff accounts are created by the Super Admin. There is no public registration.
        </p>
      </Card>
    </div>
  );
}
