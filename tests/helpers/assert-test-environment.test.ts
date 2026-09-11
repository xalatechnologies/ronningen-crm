import { describe, expect, it } from "vitest";

import {
  assertTestEnvironment,
  isTestRecordName,
  TEST_RECORD_PREFIX,
} from "./assert-test-environment";

describe("assertTestEnvironment", () => {
  it("refuses when TEST_ENV is not true", () => {
    const prev = process.env.TEST_ENV;
    process.env.TEST_ENV = "false";
    expect(() => assertTestEnvironment()).toThrow(/TEST_ENV=true/);
    process.env.TEST_ENV = prev;
  });

  it("allows when TEST_ENV is true and URL is not production", () => {
    const prevEnv = process.env.TEST_ENV;
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.TEST_ENV = "true";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    expect(() => assertTestEnvironment()).not.toThrow();
    process.env.TEST_ENV = prevEnv;
    process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
  });
});

describe("isTestRecordName", () => {
  it("detects TEST_ prefix", () => {
    expect(isTestRecordName(`${TEST_RECORD_PREFIX}org`)).toBe(true);
    expect(isTestRecordName("Production Org")).toBe(false);
  });
});
