import { brandedFromAddress, sendEmail } from "@/lib/notifications/email-client";

export function contractPublicOrigin(): string {
  const candidates = [
    process.env.CONTRACT_PUBLIC_ORIGIN,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ];
  for (const raw of candidates) {
    const value = raw?.trim().replace(/\/$/, "");
    if (!value) continue;
    try {
      const parsed = new URL(value);
      if (
        parsed.protocol === "https:" &&
        parsed.hostname !== "localhost" &&
        parsed.hostname !== "127.0.0.1"
      ) {
        return value;
      }
    } catch {
      continue;
    }
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000"
  );
}

export function contractInviteUrl(token: string): string {
  return `${contractPublicOrigin()}/kontrakt/${token}`;
}

function layout(inner: string) {
  return `<!DOCTYPE html>
<html lang="nb">
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Georgia,Times,serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #d9d2c5;padding:28px 24px;color:#1c1917;">
          <tr>
            <td style="font-size:16px;line-height:1.6;">
              ${inner}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendContractInviteEmail(input: {
  to: string;
  inviteToken: string;
  organizationName: string;
  versionId: string;
  venueName?: string | null;
  bookingReference?: string | null;
  replyTo?: string | null;
}) {
  if (!input.to) return { ok: false as const, error: "missing_recipient" };
  const url = contractInviteUrl(input.inviteToken);
  const org = escapeHtml(input.organizationName);
  const venue = input.venueName?.trim()
    ? `<p>Lokale: ${escapeHtml(input.venueName.trim())}</p>`
    : "";
  const ref = input.bookingReference?.trim()
    ? `<p>Reservasjon: ${escapeHtml(input.bookingReference.trim())}</p>`
    : "";
  const html = layout(`
    <p>Dere har mottatt en digital leieavtale fra <strong>${org}</strong>.</p>
    ${venue}${ref}
    <p><a href="${url}" style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;">Åpne og godkjenn avtalen</a></p>
    <p style="font-size:13px;color:#57534e;">Lenken er personlig og tidsbegrenset. Du trenger ikke Eventmanager-konto. Hvis knappen ikke virker, kopier denne adressen:<br />${escapeHtml(url)}</p>
  `);
  const text = [
    `Dere har mottatt en digital leieavtale fra ${input.organizationName}.`,
    input.venueName?.trim() ? `Lokale: ${input.venueName.trim()}` : "",
    input.bookingReference?.trim()
      ? `Reservasjon: ${input.bookingReference.trim()}`
      : "",
    `Åpne og godkjenn avtalen: ${url}`,
    "Lenken er personlig og tidsbegrenset. Du trenger ikke Eventmanager-konto.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return sendEmail({
    to: input.to,
    from: brandedFromAddress(input.organizationName),
    replyTo: input.replyTo?.trim() || undefined,
    subject: `Leieavtale klar til godkjenning · ${input.organizationName}`,
    html,
    text,
    idempotencyKey: `invite:${input.versionId}:${input.to}`,
  });
}

export async function sendContractOtpEmail(input: { to: string; code: string }) {
  const html = layout(
    `<p>Din bekreftelseskode er <strong>${escapeHtml(input.code)}</strong>.</p>
     <p>Koden utløper om 10 minutter. Hvis du ikke ba om denne koden, kan du se bort fra e-posten.</p>`,
  );
  return sendEmail({
    to: input.to,
    subject: "Bekreftelseskode for leieavtale",
    html,
    text: `Din bekreftelseskode er ${input.code}. Koden utløper om 10 minutter.`,
  });
}

export async function sendContractAcceptedEmail(input: {
  to: string;
  organizationName: string;
  pdfBytes: Uint8Array;
  versionId: string;
}) {
  if (!input.to) return { ok: false as const, error: "missing_recipient" };
  const html = layout(
    `<p>Avtalen med <strong>${escapeHtml(input.organizationName)}</strong> er godkjent. PDF-en er vedlagt. Dette er arkivkopien av det som ble godkjent.</p>`,
  );
  return sendEmail({
    to: input.to,
    from: brandedFromAddress(input.organizationName),
    subject: `Leieavtale godkjent · ${input.organizationName}`,
    html,
    text: `Avtalen med ${input.organizationName} er godkjent. PDF-en er vedlagt.`,
    attachments: [
      {
        filename: `leieavtale-${input.versionId.slice(0, 8)}.pdf`,
        content: Buffer.from(input.pdfBytes).toString("base64"),
        contentType: "application/pdf",
      },
    ],
    idempotencyKey: `accepted:${input.versionId}:${input.to}`,
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
