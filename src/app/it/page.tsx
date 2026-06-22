import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { APP_NAME } from "@/config/app";
import { getNetworkAccessDomains } from "@/lib/security/network-access";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: `IT-administrasjon | ${APP_NAME}`,
  description:
    "Nettverkstilgang, domener for allowlist og sikkerhetskontakt for IT-avdelinger som bruker Event Manager.",
};

function DomainTable({
  rows,
}: {
  rows: { purpose: string; host: string }[];
}) {
  return (
    <div className="overflow-x-auto rounded-[length:var(--app-radius)] border-2 border-rn-border-strong/50">
      <table className="w-full min-w-[20rem] text-left text-sm">
        <thead className="bg-rn-surface-wash font-heading text-xs font-bold tracking-wide text-rn-text-heading uppercase">
          <tr>
            <th className="px-4 py-3">Formål</th>
            <th className="px-4 py-3">Vertsnavn</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rn-border-strong/30">
          {rows.map((row) => (
            <tr key={`${row.purpose}-${row.host}`}>
              <td className="px-4 py-3 text-rn-text-slate">{row.purpose}</td>
              <td className="px-4 py-3 font-mono text-sm text-foreground">
                {row.host}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ItAccessPage() {
  const { appHost, appUrl, supabaseHost, stripeHosts } =
    getNetworkAccessDomains();

  const domainRows = [
    { purpose: "Webapplikasjon", host: appHost },
    ...(supabaseHost
      ? [{ purpose: "API og autentisering (Supabase)", host: supabaseHost }]
      : []),
    ...stripeHosts.map((host) => ({
      purpose: "Betaling (Stripe, omdirigering)",
      host,
    })),
  ];

  const itRequestNb = `Hei,

Vi trenger tilgang til ${APP_NAME} (${appUrl}) fra arbeidsnettverket vårt.

Vennligst allowlist følgende domener over HTTPS (port 443):
- ${appHost}
${supabaseHost ? `- ${supabaseHost}\n` : ""}- ${stripeHosts.join("\n- ")}

Tjenesten er en norsk SaaS for lokaler, bookinger og økonomi. Ingen proxy-bypass eller spesielle porter kreves.

Sikkerhetskontakt: security@eventmanager.no
Mer informasjon: ${appUrl}/it`;

  const itRequestEn = `Hello,

We need access to ${APP_NAME} (${appUrl}) from our corporate network.

Please allowlist the following domains over HTTPS (port 443):
- ${appHost}
${supabaseHost ? `- ${supabaseHost}\n` : ""}- ${stripeHosts.join("\n- ")}

This is a Norwegian SaaS for venue booking and finance. No proxy bypass or special ports are required.

Security contact: security@eventmanager.no
More information: ${appUrl}/it`;

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <LandingHeader />
      <main className={cn("flex-1 py-12 md:py-16", LANDING_SECTION_X)}>
        <div className={cn(LANDING_CONTAINER, "mx-auto max-w-3xl space-y-10")}>
          <header className="space-y-3">
            <p className="font-heading text-sm font-bold tracking-wide text-success uppercase">
              For IT-avdelinger
            </p>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-rn-text-heading md:text-4xl">
              Nettverkstilgang til {APP_NAME}
            </h1>
            <p className="text-base leading-relaxed text-rn-text-slate">
              Noen organisasjoner blokkerer nye eller ukategoriserte domener via
              Microsoft Defender, Entra eller andre webfiltre. Denne siden gir
              IT-administratorer det de trenger for å åpne tilgang uten å
              kompromittere sikkerhetspolicy.
            </p>
          </header>

          <section className="space-y-4">
            <h2 className="font-heading text-xl font-bold text-rn-text-heading">
              Domener som bør allowlistes
            </h2>
            <DomainTable rows={domainRows} />
            <p className="text-sm text-muted-foreground">
              Anbefalte policykategorier hos leverandøren din: Business,
              Productivity eller SaaS.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-xl font-bold text-rn-text-heading">
              Tekniske detaljer
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-rn-text-slate">
              <li>All trafikk over standard HTTPS (port 443).</li>
              <li>Ingen VPN eller proxy-bypass kreves fra sluttbruker.</li>
              <li>
                Autentisering og data lagres hos Supabase (region konfigurert
                per plattform).
              </li>
              <li>
                Betaling håndteres via Stripe Checkout (ekstern omdirigering).
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-xl font-bold text-rn-text-heading">
              Tekst til IT-administrator (kopier)
            </h2>
            <details className="rounded-[length:var(--app-radius)] border-2 border-rn-border-strong/50 bg-rn-surface-wash p-4">
              <summary className="cursor-pointer font-heading text-sm font-semibold text-rn-text-heading">
                Norsk
              </summary>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm text-rn-text-slate">
                {itRequestNb}
              </pre>
            </details>
            <details className="rounded-[length:var(--app-radius)] border-2 border-rn-border-strong/50 bg-rn-surface-wash p-4">
              <summary className="cursor-pointer font-heading text-sm font-semibold text-rn-text-heading">
                English
              </summary>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm text-rn-text-slate">
                {itRequestEn}
              </pre>
            </details>
          </section>

          <section id="sikkerhet" className="space-y-4 scroll-mt-24">
            <h2 className="font-heading text-xl font-bold text-rn-text-heading">
              Sikkerhet og ansvarlig rapportering
            </h2>
            <p className="text-sm leading-relaxed text-rn-text-slate">
              Hvis du oppdager et sikkerhetsproblem, kontakt oss på{" "}
              <a
                href="mailto:security@eventmanager.no"
                className="font-semibold text-foreground underline-offset-4 hover:underline"
              >
                security@eventmanager.no
              </a>
              . Vi setter pris på ansvarlig offentliggjøring og svarer så raskt
              vi kan.
            </p>
            <p className="text-sm text-muted-foreground">
              <Link
                href="/.well-known/security.txt"
                className="underline-offset-4 hover:underline"
              >
                security.txt
              </Link>{" "}
              (RFC 9116)
            </p>
          </section>

          <section className="space-y-3 border-t-2 border-rn-border-strong/40 pt-8">
            <h2 className="font-heading text-xl font-bold text-rn-text-heading">
              Network access (English)
            </h2>
            <p className="text-sm leading-relaxed text-rn-text-slate">
              If your organization shows a message like &quot;This content is
              blocked by your organization&quot; for {appHost}, the block is
              enforced by your corporate web filter — not by the application
              itself. Share the domain table and request text above with your IT
              team to request an allowlist exception.
            </p>
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
