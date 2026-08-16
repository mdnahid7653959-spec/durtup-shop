import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/firebaseAdapter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";

export default function StaffActivate() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);
  const [info, setInfo] = useState<{ email: string; full_name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) { setError("Missing token"); setChecking(false); return; }
      const { data, error } = await supabase.functions.invoke("staff-activate", { body: { action: "check", token } });
      if (error || (data as any)?.error) setError((data as any)?.error || error?.message || "Invalid token");
      else setInfo(data as any);
      setChecking(false);
    })();
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast({ title: "Password must be at least 8 characters", variant: "destructive" });
    if (password !== confirm) return toast({ title: "Passwords do not match", variant: "destructive" });
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("staff-activate", { body: { action: "activate", token, password } });
    setSubmitting(false);
    if (error || (data as any)?.error) return toast({ title: "Activation failed", description: (data as any)?.error || error?.message, variant: "destructive" });
    toast({ title: "Account activated", description: "Signing you in..." });
    await supabase.auth.signInWithPassword({ email: (data as any).email, password });
    nav("/staff", { replace: true });
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/40 p-4">
      <Card className="w-full max-w-md p-6 md:p-8 space-y-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Activate Your Staff Account</h1>
        </div>
        {error ? (
          <div className="text-center text-sm text-destructive">{error}</div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="text-sm bg-muted p-3 rounded">
              <p><span className="text-muted-foreground">Name:</span> <b>{info?.full_name}</b></p>
              <p><span className="text-muted-foreground">Email:</span> <b>{info?.email}</b></p>
            </div>
            <div>
              <Label>New Password</Label>
              <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Activate & Sign In
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
