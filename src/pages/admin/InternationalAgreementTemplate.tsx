import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, FileText, Download, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function InternationalAgreementTemplate() {
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [facilityName, setFacilityName] = useState("[FACILITY NAME]");
  const [governingLaw, setGoverningLaw] = useState("[STATE/JURISDICTION]");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);

  const formattedDate = new Date(effectiveDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const agreementText = `
INTERNATIONAL PLACEMENT PARTNER AGREEMENT

This International Placement Partner Agreement ("Agreement") is entered into as of ${formattedDate} ("Effective Date") by and between:

RehabLookup, LLC ("RehabLookup")
and
${facilityName} ("Facility" or "Partner")

(collectively referred to as the "Parties")

---

1. PURPOSE AND SCOPE

RehabLookup operates a platform connecting international private-pay clients seeking substance abuse and mental health treatment with qualified treatment facilities in the United States. This Agreement establishes the terms under which RehabLookup will provide marketing and placement coordination services to Facility for international candidates.

---

2. TERM

This Agreement shall commence on the Effective Date and continue on a month-to-month basis unless:
(a) Either Party provides thirty (30) days written notice of termination; or
(b) The Parties mutually agree to a twelve (12) month term in writing.

---

3. SERVICES PROVIDED BY REHABLOOKUP

RehabLookup agrees to:
• Market Facility to international private-pay candidates seeking treatment
• Screen and qualify potential candidates based on Facility's stated criteria
• Coordinate introductions between candidates and Facility
• Provide case coordination support during the placement process
• Share relevant candidate information necessary for admission decisions

---

4. PLACEMENT FEE

4.1 Fee Amount
Facility agrees to pay RehabLookup a placement fee of THREE THOUSAND DOLLARS ($3,000.00 USD) per Confirmed Admission.

4.2 Definition of Confirmed Admission
A "Confirmed Admission" occurs when:
(a) Facility has accepted the candidate for treatment; AND
(b) An intake appointment has been scheduled and confirmed with the candidate.

4.3 Payment Timing
Invoice shall be issued upon Confirmed Admission and payment is due within seven (7) calendar days of the invoice date, or upon the candidate's intake date, whichever occurs first.

4.4 No Percentage Compensation
This Agreement does not include any percentage-based compensation on treatment costs or length of stay. The placement fee is a flat rate per Confirmed Admission.

---

5. FACILITY RESPONSIBILITIES

Facility agrees to:
• Respond to candidate introductions within 48 business hours
• Provide accurate information about available beds, services, and admission criteria
• Conduct clinical assessments and make admission decisions independently
• Provide all clinical care and treatment services
• Maintain appropriate licensing, accreditation, and insurance
• Comply with all applicable laws and regulations

---

6. DATA AND PRIVACY

6.1 Facility shall protect all candidate personal information in accordance with applicable privacy laws, including but not limited to HIPAA, and shall implement appropriate security measures.

6.2 RehabLookup will share candidate information as necessary for Facility to evaluate and process admissions. Such information shall be used solely for purposes related to this Agreement.

6.3 Both Parties agree to maintain confidentiality of all business terms and proprietary information.

---

7. NON-CIRCUMVENTION

7.1 Facility agrees not to directly solicit, accept, or process any candidate introduced by RehabLookup outside of this Agreement for a period of twelve (12) months from the date of introduction.

7.2 If Facility accepts a previously introduced candidate outside of this Agreement within the non-circumvention period, the full placement fee shall remain due.

---

8. DISCLAIMERS AND LIMITATIONS

8.1 RehabLookup is NOT a treatment provider and does not provide medical, clinical, or therapeutic services.

8.2 Facility is solely responsible for all clinical care, treatment decisions, and patient outcomes.

8.3 RehabLookup makes no guarantees regarding candidate quality, admission rates, or treatment outcomes.

8.4 Neither Party shall be liable for indirect, incidental, or consequential damages.

---

9. TERMINATION

9.1 Either Party may terminate this Agreement with thirty (30) days written notice.

9.2 Upon termination, Facility remains obligated to pay placement fees for any Confirmed Admissions that occurred prior to the termination effective date.

9.3 Candidates in active placement discussions at the time of termination shall be completed under the terms of this Agreement.

---

10. GENERAL PROVISIONS

10.1 Governing Law
This Agreement shall be governed by the laws of ${governingLaw}, without regard to conflict of law principles.

10.2 Entire Agreement
This Agreement constitutes the entire understanding between the Parties and supersedes all prior discussions or agreements.

10.3 Amendments
This Agreement may only be amended in writing signed by both Parties.

10.4 Independent Contractors
The Parties are independent contractors. Nothing herein creates an employment, agency, or partnership relationship.

---

SIGNATURES

For RehabLookup, LLC:

_______________________________
Signature

_______________________________
Printed Name

_______________________________
Title

_______________________________
Date


For ${facilityName}:

_______________________________
Signature

_______________________________
Printed Name

_______________________________
Title

_______________________________
Date
`.trim();

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(agreementText);
      toast({
        title: "Copied!",
        description: "Agreement copied to clipboard",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please try again or manually select and copy the text",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Popup blocked",
        description: "Please allow popups to export PDF",
        variant: "destructive",
      });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>International Placement Partner Agreement - ${facilityName}</title>
          <style>
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              line-height: 1.6;
              max-width: 8.5in;
              margin: 0.75in auto;
              padding: 0 0.5in;
              color: #000;
            }
            h1, h2, h3 {
              font-family: Arial, sans-serif;
            }
            pre {
              white-space: pre-wrap;
              word-wrap: break-word;
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              margin: 0;
            }
            .disclaimer {
              background: #fff3cd;
              border: 2px solid #ffc107;
              padding: 12px;
              margin-bottom: 24px;
              font-weight: bold;
              text-align: center;
            }
            @media print {
              body { margin: 0; padding: 0.5in; }
              .disclaimer { background: #f8f9fa !important; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="disclaimer">
            ⚠️ TEMPLATE DOCUMENT - NOT FOR EXECUTION WITHOUT LEGAL REVIEW ⚠️<br/>
            This is a template. Have counsel review before use.
          </div>
          <pre>${agreementText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleDownloadDOCX = () => {
    // Create a simple DOCX-compatible HTML file that Word can open
    const docContent = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head>
<meta charset="utf-8">
<title>International Placement Partner Agreement</title>
<style>
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; }
  .disclaimer { background-color: #fff3cd; border: 2px solid #ffc107; padding: 12px; margin-bottom: 24px; font-weight: bold; text-align: center; }
  pre { white-space: pre-wrap; word-wrap: break-word; font-family: 'Times New Roman', Times, serif; font-size: 12pt; }
</style>
</head>
<body>
<div class="disclaimer">
  ⚠️ TEMPLATE DOCUMENT - NOT FOR EXECUTION WITHOUT LEGAL REVIEW ⚠️<br/>
  This is a template. Have counsel review before use.
</div>
<pre>${agreementText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;

    const blob = new Blob([docContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `International_Placement_Agreement_${facilityName.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded!",
      description: "Agreement downloaded as .doc file (open with Microsoft Word)",
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/international">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to International
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">International Placement Partner Agreement</h1>
              <p className="text-muted-foreground">Template document for facility partnerships</p>
            </div>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            $3,000 Per Placement
          </Badge>
        </div>

        {/* Warning Banner */}
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-200">Template Document - Not for Execution Without Legal Review</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                This is a template agreement. Have qualified legal counsel review and customize before use with any facility partner.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Customization Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customize Template</CardTitle>
            <CardDescription>Fill in the fields below to customize the agreement before copying or exporting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facilityName">Facility Name</Label>
                <Input
                  id="facilityName"
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  placeholder="Enter facility name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="effectiveDate">Effective Date</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="governingLaw">Governing Law (State/Jurisdiction)</Label>
                <Input
                  id="governingLaw"
                  value={governingLaw}
                  onChange={(e) => setGoverningLaw(e.target.value)}
                  placeholder="e.g., State of Florida"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleCopyToClipboard} variant="outline" className="gap-2">
            <Copy className="h-4 w-4" />
            Copy to Clipboard
          </Button>
          <Button onClick={handleExportPDF} variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Export as PDF
          </Button>
          <Button onClick={handleDownloadDOCX} variant="default" className="gap-2">
            <Download className="h-4 w-4" />
            Download as .DOC
          </Button>
        </div>

        {/* Key Terms Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Key Terms Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Placement Fee</span>
                  <span className="font-semibold">$3,000 USD (fixed)</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Payment Timing</span>
                  <span className="font-medium">7 days from invoice</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Term</span>
                  <span className="font-medium">Month-to-month (or 12 mo)</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Non-Circumvention</span>
                  <span className="font-medium">12 months</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Termination Notice</span>
                  <span className="font-medium">30 days written</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Percentage Comp</span>
                  <span className="font-medium text-red-600">None (flat fee only)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agreement Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agreement Preview</CardTitle>
            <CardDescription>Review the complete agreement text below</CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              ref={contentRef}
              className="bg-white dark:bg-gray-900 border rounded-lg p-8 max-h-[600px] overflow-y-auto font-serif text-sm leading-relaxed"
            >
              <pre className="whitespace-pre-wrap font-serif">{agreementText}</pre>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Footer Note */}
      <p className="text-xs text-muted-foreground text-center pb-8">
        This template is provided for informational purposes only and does not constitute legal advice. 
        RehabLookup recommends that all parties seek independent legal counsel before executing any agreement.
      </p>
    </div>
  );
}
