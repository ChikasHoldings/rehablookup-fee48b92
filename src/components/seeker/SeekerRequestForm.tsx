import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CheckCircle,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="border-success/20 bg-success/5 dark:bg-success/10 dark:border-success/30">
      <CardContent className="p-6 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mb-4">
          <CheckCircle className="h-7 w-7 text-success" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Request Sent, {firstName}!
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {facilityName} will reach out to you soon via your preferred contact method.
        </p>
        
        <div className="flex items-start gap-2 rounded-lg bg-success/5 p-3 mb-4 text-left">
          <Shield className="h-4 w-4 text-success mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
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
    <div className="space-y-3">
      {/* Compact Facility Header */}
      <div className="flex items-center gap-2.5 px-1">
        <div className="p-2 rounded-lg bg-primary/10">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground text-sm truncate">{facilityName}</h3>
          {facilityCity && facilityState && (
            <p className="text-xs text-muted-foreground">{facilityCity}, {facilityState}</p>
          )}
        </div>
      </div>
      
      {/* Lead Intake Form with unified animated flow */}
      <LeadIntakeForm 
        facilityId={facilityId}
        facilityName={facilityName}
        renderSuccess={renderSuccess} 
      />
      
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
