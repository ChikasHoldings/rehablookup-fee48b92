import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

interface UseFileAttachmentOptions {
  inquiryId: string;
}

export function useFileAttachment({ inquiryId }: UseFileAttachmentOptions) {
  const { toast } = useToast();
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image, PDF, Word document, or text file",
        variant: "destructive",
      });
      return;
    }

    setAttachment(file);
  };

  const uploadFile = async (): Promise<{ url: string; name: string } | null> => {
    if (!attachment) return null;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = attachment.name.split(".").pop();
      const fileName = `${user.id}/${inquiryId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("concierge-attachments")
        .upload(fileName, attachment);

      if (uploadError) throw uploadError;

      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from("concierge-attachments")
        .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days

      if (signedError) throw signedError;

      return { url: signedUrlData.signedUrl, name: attachment.name };
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const clearAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return {
    attachment,
    uploading,
    fileInputRef,
    handleFileSelect,
    uploadFile,
    clearAttachment,
    openFilePicker,
  };
}
