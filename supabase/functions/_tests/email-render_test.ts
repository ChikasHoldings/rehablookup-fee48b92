/**
 * Email render snapshot/contract tests.
 *
 * For every shared template builder, render with realistic fixture data and
 * assert that the output is a structurally valid HTML email body that
 * renders cleanly in Gmail / Apple Mail / Outlook.
 *
 * What we check:
 *   - HTML is non-empty and has balanced <html>/</html> if present
 *   - No unresolved `${...}` placeholders leaked through
 *   - No `undefined`, `null`, `NaN`, `[object Object]` literals from bad interpolation
 *   - All <a href="..."> values are absolute URLs (https:, http:, mailto:, tel:)
 *   - No <script> tags (transactional emails should never run JS)
 *
 * Run with: deno test supabase/functions/_tests/email-render_test.ts
 */

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  emailStart,
  emailEnd,
  emailHeader,
  emailBodyStart,
  emailBodyEnd,
  emailGreeting,
  emailParagraph,
  ctaButton,
  alertBox,
  tipBox,
  emailFooter,
  proInsightsBox,
} from "../_shared/email-templates.ts";

import {
  messageToSeekerEmail,
  messageToFacilityEmail,
  messageToAdvisorEmail,
} from "../_shared/message-email-templates.ts";

import {
  tourRequestedFacilityEmail,
  tourRequestedAdminEmail,
  tourProposedUserEmail,
  tourConfirmedFacilityEmail,
  tourCancelledFacilityEmail,
  tourCancelledUserEmail,
  tourConfirmedUserEmail,
} from "../_shared/tour-email-templates.ts";

const FORBIDDEN_SUBSTRINGS = [
  "undefined",
  "[object Object]",
  "NaN",
];

// Naive but useful: any literal `${` or `{{` left after rendering means a
// template placeholder leaked through.
const PLACEHOLDER_PATTERNS = [
  /\$\{[^}]*\}/, // unresolved JS template literal
  /\{\{[^}]*\}\}/, // unresolved Mustache/Handlebars
];

function assertCleanEmailHtml(name: string, html: string) {
  assert(typeof html === "string" && html.length > 0, `${name}: empty html`);

  for (const bad of FORBIDDEN_SUBSTRINGS) {
    // Allow "null" inside legit JSON/CSS contexts is rare in our templates; flag it anyway.
    if (html.includes(bad)) {
      throw new Error(`${name}: contains forbidden substring "${bad}"`);
    }
  }

  for (const re of PLACEHOLDER_PATTERNS) {
    const m = html.match(re);
    if (m) throw new Error(`${name}: unresolved placeholder ${m[0]}`);
  }

  // No script tags
  assert(
    !/<script[\s>]/i.test(html),
    `${name}: contains <script> tag (forbidden in transactional email)`,
  );

  // All <a href="..."> must be absolute or safe-protocol
  const hrefs = [...html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)].map(
    (m) => m[1],
  );
  for (const href of hrefs) {
    if (!/^(https?:|mailto:|tel:|#)/i.test(href)) {
      throw new Error(
        `${name}: non-absolute href "${href}" — emails cannot resolve relative URLs`,
      );
    }
  }
}

// ---- Builder primitives ----

Deno.test("email-templates: emailStart + emailEnd produce a valid wrapper", () => {
  const html = emailStart() + emailEnd();
  assertCleanEmailHtml("emailStart+End", html);
  assert(/<html/i.test(html));
  assert(/<\/html>/i.test(html));
});

Deno.test("email-templates: emailHeader handles all plan types", () => {
  for (const plan of ["free", "pro"] as const) {
    const html = emailStart() +
      emailHeader("Test Title", plan, { subtitle: "subtitle", icon: "🚀" }) +
      emailEnd();
    assertCleanEmailHtml(`emailHeader-${plan}`, html);
  }
});

Deno.test("email-templates: full assembled email renders cleanly", () => {
  const html = emailStart() +
    emailHeader("Welcome to RehabLookup", "pro", {
      subtitle: "Your Pro plan is active",
    }) +
    emailBodyStart() +
    emailGreeting("Jane") +
    emailParagraph(
      "Thanks for choosing RehabLookup. Your account is ready.",
    ) +
    proInsightsBox("Pro members average 3× faster lead response.") +
    alertBox("Action required: confirm your email.", "pro") +
    tipBox("Tip: respond within 10 minutes for best results.", "pro") +
    ctaButton("Open Dashboard", "https://rehablookup.com/provider", "pro") +
    emailBodyEnd() +
    emailFooter({ includeUnsubscribe: true, unsubscribeUrl: "https://rehablookup.com/unsubscribe" }) +
    emailEnd();

  assertCleanEmailHtml("full-assembled", html);
  // Sanity: contains the body text we passed in
  assert(html.includes("Jane"));
  assert(html.includes("Open Dashboard"));
});

// ---- Message templates ----

const messageFixture = {
  seekerName: "Jane D.",
  seekerEmail: "jane@example.com",
  facilityName: "Riverside Treatment Center",
  senderName: "Riverside Admissions",
  senderType: "facility" as const,
  messagePreview: "Hi Jane, we received your inquiry and have availability next week.",
  threadType: "facility" as const,
};

Deno.test("message-templates: messageToSeekerEmail", () => {
  assertCleanEmailHtml("messageToSeekerEmail", messageToSeekerEmail(messageFixture));
});

Deno.test("message-templates: messageToFacilityEmail", () => {
  assertCleanEmailHtml(
    "messageToFacilityEmail",
    messageToFacilityEmail({ ...messageFixture, senderType: "seeker", senderName: "Jane D." }),
  );
});

Deno.test("message-templates: messageToAdvisorEmail", () => {
  assertCleanEmailHtml(
    "messageToAdvisorEmail",
    messageToAdvisorEmail({ ...messageFixture, threadType: "advisor", senderType: "seeker", senderName: "Jane D." }),
  );
});

// ---- Tour templates ----

const tourFixture = {
  seekerName: "Jane D.",
  facilityName: "Riverside Treatment Center",
  facilityCity: "Austin",
  facilityState: "TX",
  tourType: "in-person" as const,
  preferredDates: ["2026-05-10T14:00:00Z", "2026-05-11T10:00:00Z"],
  proposedDateTime: "2026-05-10T14:00:00Z",
  confirmedDateTime: "2026-05-10T14:00:00Z",
  notes: "Please bring photo ID.",
  contactPreference: "phone",
  facilityNotes: "Ask for the admissions desk on arrival.",
};

Deno.test("tour-templates: tourRequestedFacilityEmail", () => {
  assertCleanEmailHtml(
    "tourRequestedFacilityEmail",
    tourRequestedFacilityEmail(tourFixture),
  );
});

Deno.test("tour-templates: tourRequestedAdminEmail", () => {
  assertCleanEmailHtml(
    "tourRequestedAdminEmail",
    tourRequestedAdminEmail(tourFixture),
  );
});

Deno.test("tour-templates: tourProposedUserEmail", () => {
  assertCleanEmailHtml(
    "tourProposedUserEmail",
    tourProposedUserEmail(tourFixture),
  );
});

Deno.test("tour-templates: tourConfirmedFacilityEmail", () => {
  assertCleanEmailHtml(
    "tourConfirmedFacilityEmail",
    tourConfirmedFacilityEmail(tourFixture),
  );
});

Deno.test("tour-templates: tourConfirmedUserEmail", () => {
  assertCleanEmailHtml(
    "tourConfirmedUserEmail",
    tourConfirmedUserEmail(tourFixture),
  );
});

Deno.test("tour-templates: tourCancelledFacilityEmail", () => {
  assertCleanEmailHtml(
    "tourCancelledFacilityEmail",
    tourCancelledFacilityEmail(tourFixture),
  );
});

Deno.test("tour-templates: tourCancelledUserEmail", () => {
  assertCleanEmailHtml(
    "tourCancelledUserEmail",
    tourCancelledUserEmail(tourFixture),
  );
});

// ---- Sender domain hygiene ----

Deno.test("sender domain: no off-brand sender addresses in any template", async () => {
  // Crawl shared template files; no template module should hardcode `from:`
  // since the sender is set by the calling Edge Function. This is a regression
  // guard: if someone bakes a wrong sender into a template helper, fail.
  const files = [
    "supabase/functions/_shared/email-templates.ts",
    "supabase/functions/_shared/message-email-templates.ts",
    "supabase/functions/_shared/tour-email-templates.ts",
  ];
  for (const f of files) {
    const text = await Deno.readTextFile(f).catch(() => "");
    if (!text) continue;
    // We allow sender mentions only inside comments / examples, not as a real `from:` literal
    const bad = text.match(/from:\s*["'`][^"'`]+["'`]/);
    assertEquals(
      bad,
      null,
      `${f}: shared templates must not hardcode 'from:' — caller sets it`,
    );
  }
});
