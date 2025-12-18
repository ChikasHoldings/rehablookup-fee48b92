import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrustBadge, AccreditationType } from "./TrustBadge";
import { ShieldCheck } from "lucide-react";

interface Accreditation {
  accreditation_type: string;
  verified: boolean;
}

interface TrustBadgesSectionProps {
  verified?: boolean;
  yearEstablished?: number | null;
  accreditations?: Accreditation[];
  showCard?: boolean;
}

export function TrustBadgesSection({ 
  verified, 
  yearEstablished, 
  accreditations = [],
  showCard = true
}: TrustBadgesSectionProps) {
  const currentYear = new Date().getFullYear();
  const yearsInBusiness = yearEstablished ? currentYear - yearEstablished : null;

  // Only show verified accreditations to public
  const verifiedAccreditations = accreditations.filter(a => a.verified);

  // Don't render if nothing to show
  const hasContent = verified || (yearsInBusiness && yearsInBusiness > 0) || verifiedAccreditations.length > 0;
  
  if (!hasContent) return null;

  const content = (
    <div className="flex flex-wrap gap-2">
      {verified && (
        <TrustBadge type="verified" />
      )}
      {yearsInBusiness && yearsInBusiness > 0 && (
        <TrustBadge type="years" years={yearsInBusiness} />
      )}
      {verifiedAccreditations.map((acc) => (
        <TrustBadge 
          key={acc.accreditation_type} 
          type={acc.accreditation_type as AccreditationType}
          verified={acc.verified}
        />
      ))}
    </div>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Trust & Accreditations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
        <p className="mt-4 text-xs text-muted-foreground">
          Accreditations are verified by our team. Learn more about what these badges mean.
        </p>
      </CardContent>
    </Card>
  );
}

// Inline badges for header display
export function TrustBadgesInline({ 
  verified, 
  yearEstablished, 
  accreditations = [],
  size = "md"
}: TrustBadgesSectionProps & { size?: "sm" | "md" }) {
  const currentYear = new Date().getFullYear();
  const yearsInBusiness = yearEstablished ? currentYear - yearEstablished : null;
  const verifiedAccreditations = accreditations.filter(a => a.verified);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {verified && (
        <TrustBadge type="verified" size={size} />
      )}
      {yearsInBusiness && yearsInBusiness > 0 && (
        <TrustBadge type="years" years={yearsInBusiness} size={size} />
      )}
      {verifiedAccreditations.slice(0, 2).map((acc) => (
        <TrustBadge 
          key={acc.accreditation_type} 
          type={acc.accreditation_type as AccreditationType}
          verified={acc.verified}
          size={size}
        />
      ))}
      {verifiedAccreditations.length > 2 && (
        <span className="text-xs text-muted-foreground">
          +{verifiedAccreditations.length - 2} more
        </span>
      )}
    </div>
  );
}
