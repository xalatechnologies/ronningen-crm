export type SendEmailAttachment = {
  filename: string;
  content: string;
  contentType?: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: SendEmailAttachment[];
  idempotencyKey?: string;
};

export function brandedFromAddress(displayName: string): string | undefined {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (!configured) return undefined;
  const angled = configured.match(/<([^>]+)>/);
  const address = (angled?.[1] ?? configured).trim();
  const safeName = displayName.replace(/[\r\n<>"]/g, "").trim().slice(0, 80);
  if (!safeName || !address.includes("@")) return configured;
  return `${safeName} <${address}>`;
}

export type SendEmailResult =
  | { ok: true; id?: string; testSkipped?: boolean }
  | { ok: false; skipped?: boolean; error: string };

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim(),
  );
}

/**
 * Reserved example domains (RFC 2606) and test TLDs can never receive mail. Anything addressed there is a
 * test or placeholder, so we skip the provider call and report success: tests never mail anyone, and no
 * bounce noise reaches the sending domain.
 */
export function isReservedTestAddress(address: string): boolean {
  const domain = address.trim().toLowerCase().split("@").pop() ?? "";
  return (
    /(^|\.)example\.(com|org|net)$/.test(domain) ||
    /\.(test|example|invalid|localhost)$/.test(domain) ||
    domain === "localhost"
  );
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (isReservedTestAddress(input.to)) return { ok: true, testSkipped: true };

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    console.warn(
      "[notifications] RESEND_API_KEY or RESEND_FROM_EMAIL missing — email skipped",
    );
    return { ok: false, skipped: true, error: "E-post er ikke konfigurert" };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (input.idempotencyKey) {
    headers["Idempotency-Key"] = input.idempotencyKey.slice(0, 256);
  }

  // Provider or network trouble is a result, never an exception: bulk senders must keep going.
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: input.from?.trim() || from,
        to: [input.to],
        reply_to: input.replyTo?.trim() || undefined,
        subject: input.subject,
        html: input.html,
        text: input.text,
        attachments: input.attachments?.map((file) => ({
          filename: file.filename,
          content: file.content,
          content_type: file.contentType ?? "application/pdf",
        })),
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        ok: false,
        error: body || `Resend API feilet (${response.status})`,
      };
    }

    const data = (await response.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "E-post kunne ikke sendes" };
  }
}
