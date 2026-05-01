// Parity test: ensure the edge-runtime contract module and the frontend
// mirror declare the same fields with the same constraints. We can't
// import the frontend file (it imports `zod` from npm bare specifier),
// so we compare schemas via Zod's introspectable shape on the edge side
// and a hand-maintained spec that matches the frontend file.
//
// If you change the request schema in either file, update the spec below.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { WelcomeEmailRequestSchema, WelcomeOfferRequestSchema } from "../_shared/contracts/welcome-email-contracts.ts";

const expectedRequiredKeys = [
  "facilityId",
  "facilityName",
  "providerEmail",
  "providerFirstName",
  "selectedPlan",
].sort();

const expectedOptionalKeys = ["idempotencyKey"].sort();

function classifyKeys(schema: typeof WelcomeEmailRequestSchema) {
  const shape = schema.shape;
  const required: string[] = [];
  const optional: string[] = [];
  for (const [key, value] of Object.entries(shape)) {
    // ZodOptional has isOptional() === true
    if ((value as { isOptional?: () => boolean }).isOptional?.()) {
      optional.push(key);
    } else {
      required.push(key);
    }
  }
  return { required: required.sort(), optional: optional.sort() };
}

Deno.test("WelcomeEmailRequestSchema exposes the expected required/optional fields", () => {
  const { required, optional } = classifyKeys(WelcomeEmailRequestSchema);
  assertEquals(required, expectedRequiredKeys);
  assertEquals(optional, expectedOptionalKeys);
});

Deno.test("WelcomeOfferRequestSchema is aliased to the same contract", () => {
  assertEquals(WelcomeOfferRequestSchema, WelcomeEmailRequestSchema);
});

Deno.test("WelcomeEmailRequestSchema rejects malformed UUIDs and emails", () => {
  const bad = WelcomeEmailRequestSchema.safeParse({
    facilityId: "not-a-uuid",
    facilityName: "Acme",
    providerEmail: "not-an-email",
    providerFirstName: "Jane",
    selectedPlan: "pro",
  });
  assertEquals(bad.success, false);
});

Deno.test("WelcomeEmailRequestSchema accepts a valid payload (with and without idempotencyKey)", () => {
  const base = {
    facilityId: "11111111-1111-4111-8111-111111111111",
    facilityName: "Acme",
    providerEmail: "owner@example.com",
    providerFirstName: "Jane",
    selectedPlan: "pro",
  };
  assertEquals(WelcomeEmailRequestSchema.safeParse(base).success, true);
  assertEquals(
    WelcomeEmailRequestSchema.safeParse({ ...base, idempotencyKey: "abc-123" }).success,
    true,
  );
});

Deno.test("Frontend mirror file declares the same field set", async () => {
  const url = new URL("../../../src/lib/contracts/welcome-email-contracts.ts", import.meta.url);
  const src = await Deno.readTextFile(url);
  for (const key of [...expectedRequiredKeys, ...expectedOptionalKeys]) {
    if (!src.includes(`${key}:`)) {
      throw new Error(`frontend mirror is missing field "${key}"`);
    }
  }
});
