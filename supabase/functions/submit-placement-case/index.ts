import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PlacementCaseRequest {
  seekerName: string;
  seekerEmail: string;
  seekerPhone: string;
  whoSeekingHelp: string;
  primaryIssues: string[];
  levelOfCare: string;
  paymentType: string;
  insuranceCarrier?: string;
  insurancePlan?: string;
  selfPayBudget?: string;
  preferredStates: string[];
  preferredCities?: string;
  urgency: string;
  ageRange: string;
  gender?: string;
  specialConsiderations: string[];
  additionalNotes?: string;
  preferredContactMethod: string;
  bestTimeToContact?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body: PlacementCaseRequest = await req.json();
    
    // Validate required fields
    if (!body.seekerName || !body.seekerEmail || !body.seekerPhone) {
      return new Response(
        JSON.stringify({ error: "Name, email, and phone are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create the placement case
    const { data: caseData, error: insertError } = await supabase
      .from("placement_cases")
      .insert({
        seeker_name: body.seekerName,
        seeker_email: body.seekerEmail,
        seeker_phone: body.seekerPhone,
        who_seeking_help: body.whoSeekingHelp,
        primary_issue: body.primaryIssues,
        level_of_care: body.levelOfCare,
        payment_type: body.paymentType,
        insurance_carrier: body.insuranceCarrier || null,
        insurance_plan: body.insurancePlan || null,
        self_pay_budget: body.selfPayBudget || null,
        preferred_states: body.preferredStates.length > 0 ? body.preferredStates : null,
        preferred_cities: body.preferredCities 
          ? body.preferredCities.split(",").map((c: string) => c.trim()).filter(Boolean)
          : null,
        urgency: body.urgency,
        age_range: body.ageRange,
        gender: body.gender || null,
        special_considerations: body.specialConsiderations.length > 0
          ? { needs: body.specialConsiderations }
          : {},
        additional_notes: body.additionalNotes || null,
        preferred_contact_method: body.preferredContactMethod,
        best_time_to_contact: body.bestTimeToContact || null,
        status: "new",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error creating placement case:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create placement case" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const caseNumber = caseData.id.slice(0, 8).toUpperCase();

    // Send confirmation email to user
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      
      try {
        await resend.emails.send({
          from: "RehabLookup Placement <placement@rehablookup.com>",
          to: [body.seekerEmail],
          subject: `Your Placement Request Received - Case #${caseNumber}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #0EA5E9, #10B981); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
                .content { background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px; }
                .case-number { background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
                .case-number span { font-size: 24px; font-weight: bold; font-family: monospace; color: #0EA5E9; }
                .timeline { margin: 20px 0; }
                .timeline-item { display: flex; align-items: flex-start; margin-bottom: 15px; }
                .timeline-icon { width: 32px; height: 32px; background: #e0f2fe; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0; }
                .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; font-size: 14px; }
                a { color: #0EA5E9; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 24px;">We've Received Your Request</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">A placement specialist will be in touch soon</p>
                </div>
                <div class="content">
                  <p>Hi ${body.seekerName},</p>
                  <p>Thank you for reaching out to RehabLookup's Placement Service. We understand this is an important step, and we're here to help you find the right treatment center.</p>
                  
                  <div class="case-number">
                    <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">Your Case Number</p>
                    <span>#${caseNumber}</span>
                  </div>
                  
                  <h3 style="margin-top: 25px;">What Happens Next?</h3>
                  <div class="timeline">
                    <div class="timeline-item">
                      <div class="timeline-icon">📋</div>
                      <div>
                        <strong>Case Review</strong>
                        <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">A specialist reviews your information within 24 hours</p>
                      </div>
                    </div>
                    <div class="timeline-item">
                      <div class="timeline-icon">📞</div>
                      <div>
                        <strong>Personal Call</strong>
                        <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">We'll call to discuss your situation and answer questions</p>
                      </div>
                    </div>
                    <div class="timeline-item">
                      <div class="timeline-icon">🤝</div>
                      <div>
                        <strong>Facility Introductions</strong>
                        <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">We connect you with facilities that match your needs</p>
                      </div>
                    </div>
                  </div>
                  
                  <p style="background: #fef3c7; padding: 12px; border-radius: 8px; font-size: 14px;">
                    <strong>Need immediate help?</strong> If this is an emergency, please call 911 or the SAMHSA National Helpline at <a href="tel:1-800-662-4357">1-800-662-4357</a>.
                  </p>
                  
                  <div class="footer">
                    <p>Questions? Reply to this email or call us at <a href="tel:1-800-555-0199">1-800-555-0199</a></p>
                    <p style="font-size: 12px; color: #999;">This is a free, confidential service. We do not share your information without your consent.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `,
        });
        console.log("User confirmation email sent");
      } catch (emailError) {
        console.error("Failed to send user confirmation email:", emailError);
      }

      // Send admin notification
      try {
        const urgencyLabel = {
          immediate: "🔴 IMMEDIATE",
          within_week: "🟠 This Week",
          within_month: "🟡 Within 30 Days",
          flexible: "🟢 Flexible",
        }[body.urgency] || body.urgency;

        await resend.emails.send({
          from: "RehabLookup System <system@rehablookup.com>",
          to: ["placement@rehablookup.com"],
          subject: `[NEW CASE] ${urgencyLabel} - ${body.seekerName} - ${body.levelOfCare}`,
          html: `
            <h2>New Placement Case Submitted</h2>
            <p><strong>Case #:</strong> ${caseNumber}</p>
            <p><strong>Urgency:</strong> ${urgencyLabel}</p>
            <hr>
            <h3>Contact Info</h3>
            <p><strong>Name:</strong> ${body.seekerName}</p>
            <p><strong>Email:</strong> ${body.seekerEmail}</p>
            <p><strong>Phone:</strong> ${body.seekerPhone}</p>
            <p><strong>Preferred Contact:</strong> ${body.preferredContactMethod}${body.bestTimeToContact ? ` (${body.bestTimeToContact})` : ""}</p>
            <hr>
            <h3>Treatment Needs</h3>
            <p><strong>Who Needs Help:</strong> ${body.whoSeekingHelp}</p>
            <p><strong>Primary Issues:</strong> ${body.primaryIssues.join(", ")}</p>
            <p><strong>Level of Care:</strong> ${body.levelOfCare}</p>
            <p><strong>Age Range:</strong> ${body.ageRange}</p>
            ${body.gender ? `<p><strong>Gender:</strong> ${body.gender}</p>` : ""}
            ${body.specialConsiderations.length > 0 ? `<p><strong>Special Considerations:</strong> ${body.specialConsiderations.join(", ")}</p>` : ""}
            <hr>
            <h3>Payment</h3>
            <p><strong>Payment Type:</strong> ${body.paymentType}</p>
            ${body.insuranceCarrier ? `<p><strong>Insurance:</strong> ${body.insuranceCarrier}${body.insurancePlan ? ` - ${body.insurancePlan}` : ""}</p>` : ""}
            ${body.selfPayBudget ? `<p><strong>Self-Pay Budget:</strong> ${body.selfPayBudget}</p>` : ""}
            <hr>
            <h3>Preferences</h3>
            <p><strong>Preferred States:</strong> ${body.preferredStates.length > 0 ? body.preferredStates.join(", ") : "No preference"}</p>
            ${body.preferredCities ? `<p><strong>Preferred Cities:</strong> ${body.preferredCities}</p>` : ""}
            ${body.additionalNotes ? `<p><strong>Additional Notes:</strong> ${body.additionalNotes}</p>` : ""}
          `,
        });
        console.log("Admin notification email sent");
      } catch (adminEmailError) {
        console.error("Failed to send admin notification:", adminEmailError);
      }
    }

    // Create initial status message
    await supabase.from("placement_case_messages").insert({
      case_id: caseData.id,
      message_type: "status_update",
      content: "Your placement request has been received. A specialist will review your case within 24 hours.",
      is_internal: false,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        caseId: caseData.id,
        caseNumber 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in submit-placement-case:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
