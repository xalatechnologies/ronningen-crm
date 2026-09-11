/**
 * Refuses destructive test operations unless TEST_ENV=true and URL is not production.
 */
export function assertTestEnvironment(): void {
  if (process.env.TEST_ENV !== "true") {
    throw new Error(
      "Refusing test data mutation: set TEST_ENV=true in .env.test.local",
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const productionPatterns = [
    /eventmanager\.no/i,
    /\.supabase\.co.*prod/i,
  ];

  for (const pattern of productionPatterns) {
    if (pattern.test(url)) {
      throw new Error(
        `Refusing test data mutation: Supabase URL looks like production (${url})`,
      );
    }
  }
}

export const TEST_RECORD_PREFIX = "TEST_";

export function isTestRecordName(name: string): boolean {
  return name.startsWith(TEST_RECORD_PREFIX);
}
