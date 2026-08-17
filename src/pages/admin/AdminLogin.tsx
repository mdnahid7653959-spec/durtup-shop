import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, User, Shield, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useToast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (lockoutSeconds > 0) {
      setError(`Too many failed attempts. Please wait ${lockoutSeconds}s before trying again.`);
      return;
    }

    setLoading(true);

    const cleanUsername = username.trim().replace(/[<>]/g, "");
    const result = await login(cleanUsername, password);

    if (result.success) {
      setFailedAttempts(0);
      toast({
        title: "Welcome back!",
        description: "You've successfully logged into the Durtup Admin Portal."
      });
      navigate("/dashboard");
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      if (nextAttempts >= 5) {
        setLockoutSeconds(60);
        setError("Account access temporarily locked for 60 seconds due to 5 consecutive failed login attempts.");
      } else {
        setError(`${result.error || "Invalid credentials"} (${5 - nextAttempts} attempts remaining)`);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl mb-4 shadow-lg shadow-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Durtup Admin Portal</h1>
          <p className="text-muted-foreground mt-1 text-sm">Operations & Management Console</p>
        </div>

        <Card className="shadow-xl border">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Admin Authentication</CardTitle>
            <CardDescription>
              Enter authorized administrator credentials to sign in
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Admin Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter admin ID"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Sign In to Portal
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t text-center">
              <p className="text-xs text-muted-foreground">
                Authorized personnel only. All access attempts are logged.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <a 
            href="https://durtup.shop" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-primary hover:underline inline-flex items-center gap-1.5"
          >
            <span>Visit Live Durtup Store</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </p>
      </div>
    </div>
  );
}
