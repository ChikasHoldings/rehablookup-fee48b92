import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  MapPin,
  Shield,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { LeadIntakeForm } from "@/components/lead-intake";

interface SeekerRequestFormProps {
  facilityId: string;
  facilityName: string;
  facilityCity?: string;
  facilityState?: string;
  prefillData?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    locationZip?: string;
    locationCityState?: string;
    whoSeekingHelp?: "self" | "loved-one";
    urgency?: "immediate" | "within-week" | "flexible";
    preferredContact?: "call" | "text" | "email";
    levelOfCare?: string;
    insuranceType?: string;
    primarySubstance?: string[];
    message?: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Success view with facility context
function SeekerRequestSuccess({ 
  firstName, 
  facilityName, 
  onClose 
}: { 
  firstName: string; 
  facilityName: string;
  onClose?: () => void;
}) {
  return (
    <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800/50">
      <CardContent className="p-6 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-4">
          <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
          Request Sent, {firstName}!
        </h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-4">
          {facilityName} will reach out to you soon via your preferred contact method.
        </p>
        
        <div className="flex items-start gap-2 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/30 p-3 mb-4 text-left">
          <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            Your information is confidential and only shared with this treatment facility.
          </p>
        </div>
        
        {onClose && (
          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function SeekerRequestForm({
  facilityId,
  facilityName,
  facilityCity,
  facilityState,
  prefillData,
  onSuccess,
  onCancel,
}: SeekerRequestFormProps) {
  const navigate = useNavigate();

  // Custom success handler that shows facility-specific success and triggers callback
  const renderSuccess = ({ firstName }: { firstName: string; facilityName?: string | null }) => {
    // Trigger success callback after a short delay
    if (onSuccess) {
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }
    
    return (
      <SeekerRequestSuccess 
        firstName={firstName} 
        facilityName={facilityName || "The facility"} 
        onClose={onCancel}
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Facility Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{facilityName}</h3>
              {facilityCity && facilityState && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{facilityCity}, {facilityState}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Lead Intake Form with unified animated flow */}
      <LeadIntakeForm renderSuccess={renderSuccess} />
      
      {/* Cancel button */}
      {onCancel && (
        <div className="text-center pt-2">
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground">
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
