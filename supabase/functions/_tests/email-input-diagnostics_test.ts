import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  describeEmailInput,
  detectEmailInputType,
} from "../_shared/email-input-diagnostics.ts";

Deno.test("detectEmailInputType: classifies all runtime types", () => {
  assertEquals(detectEmailInputType(undefined), "missing");
  assertEquals(detectEmailInputType(null), "null");
  assertEquals(detectEmailInputType("foo@bar.com"), "string");
  assertEquals(detectEmailInputType(""), "string");
  assertEquals(detectEmailInputType(42), "number");
  assertEquals(detectEmailInputType(true), "boolean");
  assertEquals(detectEmailInputType({}), "object");
  assertEquals(detectEmailInputType([]), "array");
});

Deno.test("describeEmailInput: missing input", () => {
  const d = describeEmailInput("seekerEmail", undefined);
  assertEquals(d.field, "seekerEmail");
  assertEquals(d.inputType, "missing");
  assertEquals(d.inputLength, undefined);
  assertEquals(d.whitespaceOnly, undefined);
});

Deno.test("describeEmailInput: empty string", () => {
  const d = describeEmailInput("seekerEmail", "");
  assertEquals(d.inputType, "string");
  assertEquals(d.inputLength, 0);
  assertEquals(d.whitespaceOnly, false);
});

Deno.test("describeEmailInput: whitespace-only string", () => {
  const d = describeEmailInput("seekerEmail", "   \t  ");
  assertEquals(d.inputType, "string");
  assertEquals(d.inputLength, 0);
  assertEquals(d.whitespaceOnly, true);
});

Deno.test("describeEmailInput: valid string reports trimmed length", () => {
  const d = describeEmailInput("seekerEmail", "  foo@bar.com  ");
  assertEquals(d.inputType, "string");
  assertEquals(d.inputLength, "foo@bar.com".length);
  assertEquals(d.whitespaceOnly, false);
});

Deno.test("describeEmailInput: non-string types do not include length", () => {
  for (const v of [null, 123, true, {}, []]) {
    const d = describeEmailInput("seekerEmail", v);
    assertEquals(d.inputLength, undefined);
    assertEquals(d.whitespaceOnly, undefined);
  }
});

Deno.test("describeEmailInput: never echoes the raw value", () => {
  const sensitive = "leak-me@example.com";
  const d = describeEmailInput("seekerEmail", sensitive);
  // The diagnostics object must not contain the raw email anywhere
  const json = JSON.stringify(d);
  assertEquals(json.includes(sensitive), false);
});
