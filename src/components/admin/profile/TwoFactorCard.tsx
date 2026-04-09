import { useState, useEffect } from "react";
import { Shield, ShieldCheck, ShieldOff, AlertTriangle, Loader2, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { TwoFactorSetupDialog } from "@/components/admin/TwoFactorSetupDialog";
import { DisableTwoFactorDialog } from "@/components/admin/DisableTwoFactorDialog";
import { RegenerateRecoveryCodesDialog } from "@/components/admin/RegenerateRecoveryCodesDialog";

interface TwoFactorCardProps {
  userId: string;
}

export function TwoFactorCard({ userId }: TwoFactorCardProps) {
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FADisable, setShow2FADisable] = useState(false);
  const [showRegenerateCodes, setShowRegenerateCodes] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isCheckingMFA, setIsCheckingMFA] = useState(true);

  // Check MFA status
  useEffect(() => {
    const checkMFAStatus = async () => {
      setIsCheckingMFA(true);
      try {
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const hasVerifiedTotp = factorsData?.totp?.some(f => f.status === 'verified');
        setMfaEnabled(!!hasVerifiedTotp);
      } catch (err) {
        console.error('Error checking MFA status:', err);
      } finally {
        setIsCheckingMFA(false);
      }
    };
    
    checkMFAStatus();
  }, []);

  // Fetch recovery codes count
  const { data: recoveryCodesCount, refetch: refetchRecoveryCodes } = useQuery({
    queryKey: ["recovery-codes-count", userId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return 0;
      
      const response = await supabase.functions.invoke('manage-mfa-recovery', {
        body: { action: 'count' },
      });
      
      if (response.error) {
        console.error('Error fetching recovery codes count:', response.error);
        return 0;
      }
      
      return response.data?.count ?? 0;
    },
    enabled: !!userId && mfaEnabled,
  });

  const handleMFASetupSuccess = () => {
    setMfaEnabled(true);
    setTimeout(() => refetchRecoveryCodes(), 500);
  };

  const handleMFADisableSuccess = () => {
    setMfaEnabled(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </div>
            {isCheckingMFA ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : mfaEnabled ? (
              <Badge className="bg-success/20 text-success">Enabled</Badge>
            ) : (
              <Badge variant="secondary">Disabled</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {mfaEnabled ? (
            <div className="space-y-4">
              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <div className="flex gap-3">
                  <ShieldCheck className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-success">Your account is protected</p>
                    <p className="text-sm text-muted-foreground">
                      Two-factor authentication is enabled. You'll need your authenticator app to sign in.
                    </p>
                    {recoveryCodesCount !== undefined && (
                      <p className={`text-sm mt-2 ${recoveryCodesCount <= 2 ? 'text-warning font-medium' : 'text-muted-foreground'}`}>
                        {recoveryCodesCount === 0 ? (
                          <span className="text-destructive font-medium">⚠️ No recovery codes remaining - regenerate now</span>
                        ) : recoveryCodesCount <= 2 ? (
                          <span>⚠️ Only {recoveryCodesCount} recovery code{recoveryCodesCount === 1 ? '' : 's'} remaining</span>
                        ) : (
                          <span>{recoveryCodesCount} recovery codes remaining</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowRegenerateCodes(true)}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Regenerate Recovery Codes
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShow2FADisable(true)}
                >
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Disable 2FA
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-warning">Recommended for admin accounts</p>
                    <p className="text-sm text-muted-foreground">
                      Two-factor authentication adds an extra layer of security by requiring a code from your authenticator app when signing in.
                    </p>
                  </div>
                </div>
              </div>
              
              <Button
                className="w-full"
                onClick={() => setShow2FASetup(true)}
              >
                <Shield className="h-4 w-4 mr-2" />
                Enable Two-Factor Authentication
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2FA Dialogs */}
      <TwoFactorSetupDialog
        open={show2FASetup}
        onOpenChange={setShow2FASetup}
        onSuccess={handleMFASetupSuccess}
      />
      <DisableTwoFactorDialog
        open={show2FADisable}
        onOpenChange={setShow2FADisable}
        onSuccess={handleMFADisableSuccess}
      />
      <RegenerateRecoveryCodesDialog
        open={showRegenerateCodes}
        onOpenChange={setShowRegenerateCodes}
        onSuccess={() => refetchRecoveryCodes()}
      />
    </>
  );
}
