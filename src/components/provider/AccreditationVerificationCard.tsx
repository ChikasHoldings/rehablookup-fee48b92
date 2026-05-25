import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Loader2, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ExternalLink,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
  Info,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  AccreditationType, 
  ACCREDITATION_OPTIONS, 
  ACCREDITATION_VERIFICATION_CONFIG 
} from "@/components/trust/TrustBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Accreditation {
  id: string;
  facility_id: string;
  accreditation_type: string;
  verified: boolean | null;
  verified_at: string | null;
  verified_by: string | null;
  expiry_date: string | null;
  created_at: string | null;
  verification_number: string | null;
  verification_url: string | null;
  document_url: string | null;
  document_name: string | null;
  issuing_authority: string | null;
  notes: string | null;
  rejection_reason: string | null;
}

interface AccreditationVerificationCardProps {
  accreditationType: AccreditationType;
  accreditation: Accreditation | null;
  facilityId: string;
  userId: string;
  onUpdate: () => void;
}

const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function AccreditationVerificationCard({
  accreditationType,
  accreditation,
  facilityId,
  userId,
  onUpdate,
}: AccreditationVerificationCardProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [verificationNumber, setVerificationNumber] = useState(accreditation?.verification_number || "");
  const [notes, setNotes] = useState(accreditation?.notes || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const option = ACCREDITATION_OPTIONS.find(o => o.value === accreditationType);
  const config = ACCREDITATION_VERIFICATION_CONFIG[accreditationType];
  
  const isChecked = !!accreditation;
  const isVerified = accreditation?.verified === true;
  const isRejected = accreditation?.rejection_reason != null;
  const hasDetails = !!(accreditation?.verification_number || accreditation?.document_url);

  const handleToggle = async (checked: boolean) => {
    try {
      if (checked) {
        // Add accreditation
        const { error } = await supabase
          .from("facility_accreditations")
          .insert({
            facility_id: facilityId,
            accreditation_type: accreditationType,
            verified: false,
          });
        if (error) throw error;
        toast({ title: "Accreditation added", description: "Please provide verification details below." });
        setIsOpen(true);
      } else {
        // Remove accreditation
        const { error } = await supabase
          .from("facility_accreditations")
          .delete()
          .eq("facility_id", facilityId)
          .eq("accreditation_type", accreditationType);
        if (error) throw error;
        toast({ title: "Accreditation removed" });
        setIsOpen(false);
      }
      onUpdate();
    } catch (error) {
      console.error("Error toggling accreditation:", error);
      toast({ title: "Error", description: "Failed to update accreditation", variant: "destructive" });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, JPG, PNG, or WebP file.",
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleSaveDetails = async () => {
    if (!accreditation) return;
    
    setIsSaving(true);
    let documentUrl = accreditation.document_url;
    let documentName = accreditation.document_name;

    try {
      // Upload document if selected
      if (selectedFile) {
        setIsUploading(true);
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${userId}/${facilityId}/accreditations/${accreditationType.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("facility-images")
          .upload(fileName, selectedFile, { cacheControl: "3600", upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("facility-images")
          .getPublicUrl(fileName);

        documentUrl = urlData.publicUrl;
        documentName = selectedFile.name;
        setIsUploading(false);
      }

      // Update accreditation record
      const { error } = await supabase
        .from("facility_accreditations")
        .update({
          verification_number: verificationNumber.trim() || null,
          notes: notes.trim() || null,
          document_url: documentUrl,
          document_name: documentName,
        })
        .eq("id", accreditation.id);

      if (error) throw error;

      toast({ title: "Details saved", description: "Your verification details have been submitted for review." });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUpdate();
    } catch (error) {
      console.error("Error saving details:", error);
      toast({ title: "Error", description: (error instanceof Error ? error.message : "") || "Failed to save details", variant: "destructive" });
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const handleRemoveDocument = async () => {
    if (!accreditation?.document_url) return;
    
    try {
      const { error } = await supabase
        .from("facility_accreditations")
        .update({ document_url: null, document_name: null })
        .eq("id", accreditation.id);

      if (error) throw error;
      toast({ title: "Document removed" });
      onUpdate();
    } catch (error) {
      console.error("Error removing document:", error);
      toast({ title: "Error", description: "Failed to remove document", variant: "destructive" });
    }
  };

  const getStatusBadge = () => {
    if (isVerified) {
      return (
        <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-200 text-xs">
          <CheckCircle className="h-3 w-3" />
          Verified
        </Badge>
      );
    }
    if (isRejected) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="gap-1 bg-red-500/10 text-red-700 border-red-200 text-xs cursor-help">
                <XCircle className="h-3 w-3" />
                Rejected
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-[250px]">
              <p className="text-xs">{accreditation?.rejection_reason}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (hasDetails) {
      return (
        <Badge variant="secondary" className="gap-1 bg-orange-500/10 text-orange-700 border-orange-200 text-xs">
          <Clock className="h-3 w-3" />
          Pending Review
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50 text-xs">
        <AlertCircle className="h-3 w-3" />
        Needs Info
      </Badge>
    );
  };

  if (!option || !config) return null;

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        isChecked ? "border-border bg-background" : "border-border/50 bg-muted/30",
        isOpen && isChecked && "ring-1 ring-primary/20"
      )}
    >
      <Collapsible open={isOpen && isChecked} onOpenChange={setIsOpen}>
        <div className="flex items-start gap-3 p-3">
          <Checkbox
            id={accreditationType}
            checked={isChecked}
            onCheckedChange={handleToggle}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Label htmlFor={accreditationType} className="text-sm font-medium cursor-pointer">
                {option.label}
              </Label>
              {isChecked && getStatusBadge()}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
          </div>
          {isChecked && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          )}
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1 border-t border-dashed space-y-4">
            <p className="text-xs text-muted-foreground">
              Provide verification details to expedite the review process.
            </p>
            
            {/* Verification Number */}
            {config.requiresNumber && (
              <div className="space-y-1.5">
                <Label htmlFor={`${accreditationType}-number`} className="text-xs font-medium">
                  {config.numberLabel}
                </Label>
                <Input
                  id={`${accreditationType}-number`}
                  value={verificationNumber}
                  onChange={(e) => setVerificationNumber(e.target.value)}
                  placeholder={config.numberPlaceholder}
                  className="h-9 text-sm"
                />
                {config.numberHint && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    {config.numberHint}
                  </p>
                )}
              </div>
            )}

            {/* Document Upload */}
            {config.supportsDocument && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{config.documentLabel}</Label>
                
                {accreditation?.document_url ? (
                  <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs truncate flex-1">
                      {accreditation.document_name || "Uploaded document"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => window.open(accreditation.document_url!, '_blank')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={handleRemoveDocument}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`${accreditationType}-file`}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 h-9 rounded-md border border-dashed px-3 text-xs cursor-pointer hover:bg-muted/50 transition-colors",
                        isUploading && "opacity-50 pointer-events-none"
                      )}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {selectedFile ? selectedFile.name : "Upload certificate (PDF, JPG, PNG)"}
                    </Label>
                    <input
                      ref={fileInputRef}
                      id={`${accreditationType}-file`}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Lookup Link */}
            {config.lookupUrl && (
              <a
                href={config.lookupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {config.lookupLabel}
              </a>
            )}

            {/* Save Button */}
            <Button
              onClick={handleSaveDetails}
              disabled={isSaving}
              size="sm"
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isUploading ? "Uploading..." : "Saving..."}
                </>
              ) : (
                "Save Verification Details"
              )}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}