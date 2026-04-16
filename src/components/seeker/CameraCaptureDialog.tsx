import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, X, RotateCcw, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CameraCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (blob: Blob) => void;
}

export function CameraCaptureDialog({
  open,
  onOpenChange,
  onCapture,
}: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setCapturedImage(null);

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError("Camera access denied. Please allow camera access in your browser settings.");
        } else if (err.name === "NotFoundError") {
          setError("No camera found on this device.");
        } else {
          setError("Could not access camera. Please try again.");
        }
      }
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas size to match video
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;

    // Calculate crop offset to center the image
    const offsetX = (video.videoWidth - size) / 2;
    const offsetY = (video.videoHeight - size) / 2;

    // Draw cropped square from video
    context.drawImage(
      video,
      offsetX,
      offsetY,
      size,
      size,
      0,
      0,
      size,
      size
    );

    // Get image as data URL
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(imageDataUrl);
    stopCamera();
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmPhoto = useCallback(() => {
    if (!capturedImage) return;

    // Convert data URL to Blob
    fetch(capturedImage)
      .then((res) => res.blob())
      .then((blob) => {
        onCapture(blob);
        onOpenChange(false);
      });
  }, [capturedImage, onCapture, onOpenChange]);

  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }, []);

  // Start camera when dialog opens
  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setError(null);
    }
  }, [open, startCamera, stopCamera]);

  // Restart camera when facing mode changes
  useEffect(() => {
    if (open && isStreaming) {
      startCamera();
    }
  }, [facingMode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Take Profile Photo
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-square bg-black">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <div>
                <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startCamera}
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
              />
              {/* Circular guide overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-4 rounded-full border-2 border-white/50 border-dashed" />
              </div>
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-4 flex justify-center gap-3">
          {capturedImage ? (
            <>
              <Button
                variant="outline"
                onClick={retakePhoto}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Retake
              </Button>
              <Button onClick={confirmPhoto} className="gap-2">
                <Check className="h-4 w-4" />
                Use Photo
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleCamera}
                disabled={!isStreaming}
                title="Switch camera"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                onClick={capturePhoto}
                disabled={!isStreaming}
                className="gap-2 px-8"
              >
                <Camera className="h-5 w-5" />
                Capture
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
