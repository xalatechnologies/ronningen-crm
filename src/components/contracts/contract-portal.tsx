"use client";

import { useEffect, useState } from "react";

import { ContractDocumentView } from "@/components/contracts/contract-document-view";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n/client";
import type { FrozenContractDocument } from "@/lib/contracts/types";

type CurrentPayload = {
  status: string;
  processingStatus: string;
  contentHash: string;
  accepted: boolean;
  acceptance?: { fullName: string; acceptedAt: string } | null;
  document: FrozenContractDocument;
};

export function ContractPortal({ token }: { token: string }) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<CurrentPayload | null>(null);
  const [read, setRead] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [authority, setAuthority] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const session = await fetch("/api/contracts/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!session.ok) {
        setError("not_found");
        return;
      }
      await fetch("/api/contracts/view", { method: "POST" });
      const currentRes = await fetch("/api/contracts/current");
      if (!currentRes.ok) {
        setError("not_found");
        return;
      }
      setCurrent((await currentRes.json()) as CurrentPayload);
    })();
  }, [token]);

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-heading text-2xl font-bold">{t("contracts.portal.notFound")}</h1>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p>{t("common.actions.loading")}</p>
      </main>
    );
  }

  const doc = current.document;

  async function accept() {
    const snapshot = current;
    if (!snapshot) return;
    setBusy(true);
    try {
      const res = await fetch("/api/contracts/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name,
          termsAccepted: acceptTerms,
          readAccepted: read,
          companyAuthority: authority,
          contentHash: snapshot.contentHash,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as {
          acceptance?: { fullName: string; acceptedAt: string };
        };
        const next = await fetch("/api/contracts/current");
        const data = next.ok ? ((await next.json()) as CurrentPayload) : null;
        setCurrent({
          ...(data ?? snapshot),
          accepted: true,
          status: data?.status ?? "accepted",
          acceptance:
            data?.acceptance ??
            body.acceptance ?? {
              fullName: name.trim(),
              acceptedAt: new Date().toISOString(),
            },
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-heading text-2xl font-bold">{t("contracts.portal.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("contracts.portal.openHint")}</p>
      <p className="mt-2 text-xs text-muted-foreground">{t("contracts.portal.assurance")}</p>

      <ContractDocumentView document={doc} acceptance={current.acceptance} />

      {current.accepted ? (
        <section className="mt-8 space-y-3">
          <p className="font-semibold">{t("contracts.portal.receipt")}</p>
          <a className={buttonVariants()} href="/api/contracts/pdf">
            {t("contracts.portal.pdf")}
          </a>
          <p className="text-sm text-muted-foreground">{t("contracts.portal.contact")}</p>
        </section>
      ) : (
        <section className="mt-8 space-y-4">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} />
            {t("contracts.portal.read")}
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            {t("contracts.portal.acceptTerms")}
          </label>
          {doc.customer.companyName ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={authority}
                onChange={(e) => setAuthority(e.target.checked)}
              />
              {t("contracts.portal.authority")}
            </label>
          ) : null}
          <div>
            <label className="text-sm font-medium">{t("contracts.portal.fullName")}</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <Button
            type="button"
            disabled={
              busy ||
              !read ||
              !acceptTerms ||
              name.trim().length < 2 ||
              (Boolean(doc.customer.companyName) && !authority)
            }
            onClick={() => void accept()}
          >
            {t("contracts.portal.submit")}
          </Button>
        </section>
      )}
    </main>
  );
}
