import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileText, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  Clock,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CredentialDocument {
  id: string;
  facility_id: string;
  document_name: string;
  document_url: string;
  document_type: string;
  status: 'pending' | 'verified' | 'rejected';
  uploaded_at: string;
  verified_at?: string | null;
  rejection_reason?: string | null;
}

interface CredentialsUploadProps {
  facilityId: string;
  userId: string;
}

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function CredentialsUpload({ facilityId, userId }: CredentialsUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch existing credential documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["facility-credentials-docs", facilityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facility_credential_documents")
        .select("*")
        .eq("facility_id", facilityId)
        .order("uploaded_at", { ascending: false });
      
      if (error) {
        // Table might not exist yet, return empty array
        console.warn("Error fetching credential documents:", error);
        return [];
      }
      return data as CredentialDocument[];
    },
    enabled: !!facilityId,
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, JPG, PNG, or WebP file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    if (!documentName.trim()) {
      toast({
        title: "Document name required",
        description: "Please enter a name for this document (e.g., 'State License', 'CARF Certificate').",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${facilityId}/credentials/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("facility-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("facility-images")
        .getPublicUrl(fileName);

      // Save document record to database
      const { error: dbError } = await supabase
        .from("facility_credential_documents")
        .insert({
          facility_id: facilityId,
          document_name: documentName.trim(),
          document_url: urlData.publicUrl,
          document_type: file.type,
          status: 'pending',
        });

      if (dbError) {
        // If DB insert fails, try to clean up the uploaded file
        await supabase.storage.from("facility-images").remove([fileName]);
        throw dbError;
      }

      toast({
        title: "Document uploaded",
        description: "Your credential document has been submitted for verification.",
      });

      setDocumentName("");
      queryClient.invalidateQueries({ queryKey: ["facility-credentials-docs", facilityId] });
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  const handleDeleteDocument = async (document: CredentialDocument) => {
    try {
      // Extract file path from URL for deletion
      const urlParts = document.document_url.split('/');
      const filePath = urlParts.slice(-4).join('/'); // Get the path after bucket name

      // Delete from storage
      await supabase.storage.from("facility-images").remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from("facility_credential_documents")
        .delete()
        .eq("id", document.id);

      if (error) throw error;

      toast({
        title: "Document removed",
      });

      queryClient.invalidateQueries({ queryKey: ["facility-credentials-docs", facilityId] });
    } catch (error: any) {
      console.error("Error deleting document:", error);
      toast({
        title: "Failed to delete",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-700 border-green-200 text-xs">
            <CheckCircle className="h-3 w-3" />
            Verified
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="secondary" className="gap-1 bg-red-500/10 text-red-700 border-red-200 text-xs">
            <AlertCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 text-muted-foreground text-xs border-dashed">
            <Clock className="h-3 w-3" />
            Pending Review
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Upload Credential Documents</Label>
        <p className="text-xs text-muted-foreground">
          Upload licenses, certifications, or other credential documents. Our team will verify them within 24-48 hours.
        </p>
      </div>

      {/* Upload Form */}
      <div className="space-y-3 p-4 rounded-lg border border-dashed border-border bg-muted/30">
        <div className="space-y-2">
          <Label htmlFor="document-name" className="text-xs">Document Name</Label>
          <Input
            id="document-name"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            placeholder="e.g., State License, CARF Certificate, DEA Registration"
            className="h-9 text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Label
            htmlFor="credential-upload"
            className={cn(
              "flex-1 flex items-center justify-center gap-2 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors",
              isUploading && "opacity-50 pointer-events-none"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Choose File (PDF, JPG, PNG)
              </>
            )}
          </Label>
          <input
            id="credential-upload"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isUploading}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Max file size: 10MB
        </p>
      </div>

      {/* Uploaded Documents List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : documents.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Uploaded Documents</Label>
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{doc.document_name}</p>
                    {getStatusBadge(doc.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                  {doc.status === 'rejected' && doc.rejection_reason && (
                    <p className="text-xs text-red-600 mt-1">
                      Reason: {doc.rejection_reason}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteDocument(doc)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">
          No credential documents uploaded yet.
        </p>
      )}
    </div>
  );
}