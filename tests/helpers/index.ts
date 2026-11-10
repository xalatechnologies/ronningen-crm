export { assertTestEnvironment, isTestRecordName, TEST_RECORD_PREFIX } from "./assert-test-environment";

export function mockCronRequest(
  secret: string,
  options?: { header?: "authorization" | "x-cron-secret" },
): Request {
  const header = options?.header ?? "authorization";
  const headers = new Headers();
  if (header === "authorization") {
    headers.set("authorization", `Bearer ${secret}`);
  } else {
    headers.set("x-cron-secret", secret);
  }
  return new Request("http://localhost:3000/api/cron/test", {
    method: "GET",
    headers,
  });
}

export function mockStripeWebhookRequest(
  body: string,
  signature?: string | null,
): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (signature) {
    headers.set("stripe-signature", signature);
  }
  return new Request("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    headers,
    body,
  });
}
