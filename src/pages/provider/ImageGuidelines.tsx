import { 
  CheckCircle2, 
  XCircle, 
  Camera, 
  Image as ImageIcon, 
  AlertTriangle,
  FileImage,
  Shield,
  Info
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const ImageGuidelines = () => {
  const acceptableImages = [
    "Professional exterior photos of your facility",
    "Clean, well-lit interior shots of common areas",
    "Treatment rooms and therapy spaces",
    "Outdoor amenities (gardens, recreational areas)",
    "Dining areas and accommodation spaces",
    "Staff photos with proper consent",
    "Branded logos in standard formats (PNG, JPG, WebP)",
  ];

  const unacceptableImages = [
    "Images containing patient faces or identifying information",
    "Stock photos misrepresenting your actual facility",
    "Low-resolution or blurry images",
    "Images with visible personal data or documents",
    "Inappropriate, offensive, or misleading content",
    "Images with watermarks from other sources",
    "Before/after patient photos without consent",
  ];

  const technicalRequirements = [
    { label: "Maximum file size", value: "5MB per image" },
    { label: "Supported formats", value: "PNG, JPG, JPEG, WebP" },
    { label: "Recommended logo size", value: "512 x 512 pixels (square)" },
    { label: "Recommended gallery size", value: "1200 x 800 pixels minimum" },
    { label: "Gallery limit", value: "Up to 10 images" },
  ];

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      <div className="max-w-5xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">Image Guidelines</h1>
        <p className="text-muted-foreground mt-1">
          Standards for facility logo and gallery images
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Images that violate these guidelines may be flagged for review and removed from your profile. 
          Repeated violations may result in account suspension.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Acceptable Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              Acceptable Images
            </CardTitle>
            <CardDescription>
              These types of images help showcase your facility professionally
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {acceptableImages.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Unacceptable Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Unacceptable Images
            </CardTitle>
            <CardDescription>
              These types of images will be flagged and may be removed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {unacceptableImages.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Technical Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Technical Requirements
          </CardTitle>
          <CardDescription>
            Ensure your images meet these specifications for optimal display
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {technicalRequirements.map((req, index) => (
              <div key={index} className="rounded-lg border p-4">
                <p className="text-sm font-medium text-foreground">{req.label}</p>
                <p className="text-sm text-muted-foreground mt-1">{req.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photography Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Lighting</h4>
              <p className="text-sm text-muted-foreground">
                Use natural lighting when possible. Avoid harsh shadows or overly dark images.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Composition</h4>
              <p className="text-sm text-muted-foreground">
                Frame shots to highlight the space. Remove clutter and ensure areas are tidy.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Authenticity</h4>
              <p className="text-sm text-muted-foreground">
                Only use photos of your actual facility. Stock photos are not permitted.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Privacy</h4>
              <p className="text-sm text-muted-foreground">
                Never include patients or sensitive information in photos without proper consent.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Process */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Image Review Process
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All uploaded images are subject to review. Here's what happens if an image is flagged:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                1
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Notification</p>
                <p className="text-sm text-muted-foreground">
                  You'll receive an email notification when an image is flagged for review.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                2
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Admin Review</p>
                <p className="text-sm text-muted-foreground">
                  Our team will review the flagged image and determine if it violates guidelines.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                3
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Resolution</p>
                <p className="text-sm text-muted-foreground">
                  If the image violates guidelines, it may be removed. You can upload a replacement that meets our standards.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert variant="default" className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>HIPAA Compliance:</strong> Never upload images that could identify patients or contain protected health information (PHI). 
          Violations may result in immediate account suspension and potential legal consequences.
        </AlertDescription>
      </Alert>
      </div>
    </div>
  );
};

export default ImageGuidelines;
