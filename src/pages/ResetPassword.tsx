import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Heart, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes (must be set up before getSession)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
      } else if (session) {
        setIsValidSession(true);
      }
      setIsChecking(false);
    });

    // Also check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsValidSession(true);
      }
      setIsChecking(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated successfully!');
      navigate('/account');
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <>
        <SEO title="Invalid Link | Reset Password" description="This password reset link is invalid or has expired." noindex={true} />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
          <div className="p-4">
            <Link to="/login" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
          
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl border-border/50">
              <CardHeader className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
                  <Lock className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle className="text-2xl font-bold">Invalid or Expired Link</CardTitle>
                <CardDescription className="text-base">
                  This password reset link is invalid or has expired. Please request a new one.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full" size="lg">
                  <Link to="/login">Back to Sign In</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title="Reset Password" description="Set a new password for your account." noindex={true} />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
        <div className="p-4">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl border-border/50">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
              <CardDescription className="text-base">
                Enter your new password below
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-new-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
