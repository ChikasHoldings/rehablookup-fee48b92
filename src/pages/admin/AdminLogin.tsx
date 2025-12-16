import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, Ban } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: isAdmin } = await supabase.rpc('has_role', {
          _user_id: session.user.id,
          _role: 'admin'
        });
        
        if (isAdmin) {
          // Check if suspended
          const { data: profile } = await supabase
            .from('admin_user_profiles')
            .select('status')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          if (profile?.status === 'suspended') {
            await supabase.auth.signOut();
            setIsSuspended(true);
            return;
          }
          
          navigate("/admin", { replace: true });
        }
      }
    };
    checkExistingSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSuspended(false);

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as 'email' | 'password'] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Check if email is blocked
      const { data: isBlocked, error: blockError } = await supabase
        .rpc('is_identifier_blocked', { p_identifier: normalizedEmail });

      if (!blockError && isBlocked) {
        toast.error("This account has been blocked. Please contact support if you believe this is an error.");
        setIsLoading(false);
        return;
      }

      // Server-side rate limit check
      const { data: rateLimitResult, error: rateLimitError } = await supabase
        .rpc('check_rate_limit', {
          p_identifier: normalizedEmail,
          p_action_type: 'admin_login',
          p_max_attempts: 5,
          p_window_minutes: 15
        });

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError);
      } else if (rateLimitResult) {
        const rateLimitData = rateLimitResult as { is_limited: boolean; retry_after_seconds: number; attempts: number };
        if (rateLimitData.is_limited) {
          const retryAfter = rateLimitData.retry_after_seconds || 0;
          toast.error(`Too many attempts. Please wait ${Math.ceil(retryAfter / 60)} minute(s).`);
          setIsLoading(false);
          return;
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Log failed attempt to server
        await supabase.rpc('log_rate_limit_event', {
          p_identifier: normalizedEmail,
          p_action_type: 'admin_login',
          p_success: false,
          p_metadata: { error_type: 'invalid_credentials' }
        });

        toast.error("Invalid credentials");
        setIsLoading(false);
        return;
      }

      if (data.user) {
        const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
          _user_id: data.user.id,
          _role: 'admin'
        });

        if (roleError || !isAdmin) {
          // Log failed attempt (not admin)
          await supabase.rpc('log_rate_limit_event', {
            p_identifier: normalizedEmail,
            p_action_type: 'admin_login',
            p_success: false,
            p_metadata: { error_type: 'not_admin' }
          });

          await supabase.auth.signOut();
          toast.error("Access denied. Admin privileges required.");
          setIsLoading(false);
          return;
        }

        // Check if admin is suspended
        const { data: profile } = await supabase
          .from('admin_user_profiles')
          .select('status')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (profile?.status === 'suspended') {
          // Log failed attempt (suspended)
          await supabase.rpc('log_rate_limit_event', {
            p_identifier: normalizedEmail,
            p_action_type: 'admin_login',
            p_success: false,
            p_metadata: { error_type: 'suspended' }
          });

          await supabase.auth.signOut();
          setIsSuspended(true);
          setIsLoading(false);
          return;
        }

        // Log successful login to rate limit log
        await supabase.rpc('log_rate_limit_event', {
          p_identifier: normalizedEmail,
          p_action_type: 'admin_login',
          p_success: true,
          p_metadata: { user_id: data.user.id }
        });

        // Update last login timestamp
        await supabase
          .from('admin_user_profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('user_id', data.user.id);

        // Log to admin audit log for activity tracking
        await logAdminAction({
          actionType: "admin_login",
          targetType: "admin_user",
          targetId: data.user.id,
          details: { email: normalizedEmail },
        });

        toast.success("Welcome back, Admin!");
        navigate("/admin", { replace: true });
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Suspended account view
  if (isSuspended) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <Ban className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-destructive">Account Suspended</CardTitle>
            <CardDescription className="text-base mt-2">
              Your admin account has been suspended and you cannot access the admin panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Why was my account suspended?</p>
              <p>
                Account suspensions are typically due to policy violations or security concerns. 
                If you believe this is an error, please contact a Super Admin for assistance.
              </p>
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setIsSuspended(false)}
            >
              Try Another Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
            <Shield className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={errors.password ? "border-destructive pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
