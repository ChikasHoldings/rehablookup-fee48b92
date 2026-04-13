import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileText, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  Clock,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Eye,
  X,
  Download,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CredentialDocument {
  id: string;
  facility_id: string;
  document_name: string;
  document_url: string;
  document_type: string;
  document_category?: string;
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

// Document category definitions with keywords for auto-detection
const DOCUMENT_CATEGORIES = [
  { value: 'license', label: 'License', keywords: ['license', 'lic', 'licensing', 'licensed'] },
  { value: 'certificate', label: 'Certificate', keywords: ['certificate', 'cert', 'certification', 'certified', 'carf', 'jcaho', 'joint commission'] },
  { value: 'insurance', label: 'Insurance', keywords: ['insurance', 'liability', 'malpractice', 'coverage', 'policy', 'insured'] },
  { value: 'accreditation', label: 'Accreditation', keywords: ['accreditation', 'accredited', 'accredit'] },
  { value: 'dea', label: 'DEA Registration', keywords: ['dea', 'drug enforcement', 'controlled substance'] },
  { value: 'npi', label: 'NPI Documentation', keywords: ['npi', 'national provider'] },
  { value: 'business', label: 'Business License', keywords: ['business', 'llc', 'incorporation', 'articles', 'ein', 'tax'] },
  { value: 'staff', label: 'Staff Credentials', keywords: ['staff', 'employee', 'personnel', 'clinician', 'therapist', 'counselor', 'doctor', 'nurse'] },
  { value: 'other', label: 'Other', keywords: [] },
];

// Auto-detect document category from filename and document name
function detectDocumentCategory(fileName: string, documentName: string): { category: string; confidence: 'high' | 'medium' | 'low' } {
  const searchText = `${fileName} ${documentName}`.toLowerCase();
  
  let bestMatch = { category: 'other', score: 0 };
  
  for (const cat of DOCUMENT_CATEGORIES) {
    if (cat.value === 'other') continue;
    
    let matchScore = 0;
    for (const keyword of cat.keywords) {
      if (searchText.includes(keyword)) {
        // Longer keywords get higher scores for more specific matches
        matchScore += keyword.length;
      }
    }
    
    if (matchScore > bestMatch.score) {
      bestMatch = { category: cat.value, score: matchScore };
    }
  }
  
  // Determine confidence based on score
  let confidence: 'high' | 'medium' | 'low';
  if (bestMatch.score >= 10) {
    confidence = 'high';
  } else if (bestMatch.score >= 5) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }
  
  return { category: bestMatch.category, confidence };
}

export function CredentialsUpload({ facilityId, userId }: CredentialsUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("other");
  const [detectedCategory, setDetectedCategory] = useState<{ category: string; confidence: 'high' | 'medium' | 'low' } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewDocument, setPreviewDocument] = useState<CredentialDocument | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Auto-detect category when document name or file changes
  useEffect(() => {
    if (documentName || selectedFile) {
      const fileName = selectedFile?.name || '';
      const detected = detectDocumentCategory(fileName, documentName);
      setDetectedCategory(detected);
      
      // Auto-set category if confidence is high or medium
      if (detected.confidence !== 'low' && detected.category !== 'other') {
        setSelectedCategory(detected.category);
      }
    } else {
      setDetectedCategory(null);
    }
  }, [documentName, selectedFile]);

  // Fetch existing credential documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["facility-credentials-docs", facilityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facility_credential_documents")
        .select("id, facility_id, document_name, document_type, document_url, status, rejection_reason, uploaded_at, verified_at, verified_by")
        .eq("facility_id", facilityId)
        .order("uploaded_at", { ascending: false });
      
      if (error) {
        console.warn("Error fetching credential documents:", error);
        return [];
      }
      return data as CredentialDocument[];
    },
    enabled: !!facilityId,
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, JPG, PNG, or WebP file.",
        variant: "destructive",
      });
      event.target.value = '';
      return;
    }

    // Validate file size
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
    
    // Auto-fill document name from filename if empty
    if (!documentName.trim()) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
      setDocumentName(nameWithoutExt);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    const trimmedName = documentName.trim();
    if (!trimmedName) {
      toast({
        title: "Document name required",
        description: "Please enter a name for this document.",
        variant: "destructive",
      });
      return;
    }

    // Sanitize document name - strip HTML/JS
    const sanitizedName = trimmedName
      .replace(/<[^>]*>/g, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "")
      .slice(0, 200);

    if (!sanitizedName) {
      toast({
        title: "Invalid document name",
        description: "Document name contains invalid characters.",
        variant: "destructive",
      });
      return;
    }

    // Validate UUID format for facilityId and userId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(facilityId) || !uuidRegex.test(userId)) {
      toast({
        title: "Invalid request",
        description: "Invalid facility or user identifier.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Generate a unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${userId}/${facilityId}/credentials/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("facility-images")
        .upload(fileName, selectedFile, {
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

      // Get category label for display
      const categoryLabel = DOCUMENT_CATEGORIES.find(c => c.value === selectedCategory)?.label || 'Other';

      // Save document record to database
      const { error: dbError } = await supabase
        .from("facility_credential_documents")
        .insert({
          facility_id: facilityId,
          document_name: `${sanitizedName} (${categoryLabel})`,
          document_url: urlData.publicUrl,
          document_type: selectedFile.type,
          status: 'pending',
        });

      if (dbError) {
        await supabase.storage.from("facility-images").remove([fileName]);
        throw dbError;
      }

      toast({
        title: "Document uploaded",
        description: `Your ${categoryLabel.toLowerCase()} has been submitted for verification.`,
      });

      // Reset form
      setDocumentName("");
      setSelectedFile(null);
      setSelectedCategory("other");
      setDetectedCategory(null);
      
      // Reset file input
      const fileInput = document.getElementById('credential-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
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

  const getCategoryBadge = (docName: string) => {
    const lowerName = docName.toLowerCase();
    for (const cat of DOCUMENT_CATEGORIES) {
      if (lowerName.includes(cat.label.toLowerCase())) {
        return (
          <Badge variant="outline" className="text-xs ml-1">
            {cat.label}
          </Badge>
        );
      }
    }
    return null;
  };

  const isImageFile = (docType: string) => {
    return docType.startsWith('image/');
  };

  const isPdfFile = (docType: string) => {
    return docType === 'application/pdf';
  };

  const handlePreview = (doc: CredentialDocument) => {
    setPreviewDocument(doc);
    setZoomLevel(100);
  };

  const handleClosePreview = () => {
    setPreviewDocument(null);
    setZoomLevel(100);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50));
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
        {/* File Selection */}
        <div className="space-y-2">
          <Label htmlFor="credential-upload" className="text-xs">Select File</Label>
          <div className="flex items-center gap-2">
            <Label
              htmlFor="credential-upload"
              className={cn(
                "flex-1 flex items-center justify-center gap-2 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors",
                isUploading && "opacity-50 pointer-events-none"
              )}
            >
              <Upload className="h-4 w-4" />
              {selectedFile ? selectedFile.name : "Choose File (PDF, JPG, PNG)"}
            </Label>
            <input
              id="credential-upload"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
          </div>
        </div>

        {/* Document Name */}
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

        {/* Document Category with Auto-Detection */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="document-category" className="text-xs">Document Type</Label>
            {detectedCategory && detectedCategory.category !== 'other' && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs gap-1",
                  detectedCategory.confidence === 'high' && "bg-green-500/10 text-green-700 border-green-200",
                  detectedCategory.confidence === 'medium' && "bg-yellow-500/10 text-yellow-700 border-yellow-200",
                  detectedCategory.confidence === 'low' && "bg-muted text-muted-foreground"
                )}
              >
                <Sparkles className="h-3 w-3" />
                Auto-detected
              </Badge>
            )}
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Upload Button */}
        <Button 
          onClick={handleUpload} 
          disabled={isUploading || !selectedFile}
          className="w-full"
          size="sm"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </>
          )}
        </Button>
        
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
                    onClick={() => handlePreview(doc)}
                    title="Preview document"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a href={doc.document_url} target="_blank" rel="noopener noreferrer" title="Open in new tab">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteDocument(doc)}
                    title="Delete document"
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

      {/* Document Preview Modal */}
      <Dialog open={!!previewDocument} onOpenChange={(open) => !open && handleClosePreview()}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-medium truncate pr-4">
                {previewDocument?.document_name}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {previewDocument && isImageFile(previewDocument.document_type) && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleZoomOut}
                      disabled={zoomLevel <= 50}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground w-12 text-center">{zoomLevel}%</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleZoomIn}
                      disabled={zoomLevel >= 200}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={previewDocument?.document_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="overflow-auto max-h-[calc(90vh-80px)] p-4 flex items-center justify-center bg-muted/20">
            {previewDocument && isImageFile(previewDocument.document_type) && (
              <img
                src={previewDocument.document_url}
                alt={previewDocument.document_name}
                className="max-w-full h-auto rounded-lg shadow-lg transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center' }}
              />
            )}
            
            {previewDocument && isPdfFile(previewDocument.document_type) && (
              <iframe
                src={`${previewDocument.document_url}#toolbar=1&navpanes=0`}
                className="w-full h-[70vh] rounded-lg border"
                title={previewDocument.document_name}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}