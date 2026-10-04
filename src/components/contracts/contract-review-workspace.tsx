"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ContractDocumentView } from "@/components/contracts/contract-document-view";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createRevision,
  sendContract,
  updateDraft,
  withdrawOffer,
} from "@/lib/contracts/actions";
import { useTranslation } from "@/i18n/client";
import { parseSendBlockedError, sendBlockingGaps } from "@/lib/contracts/rules";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import type { ContractStatus, FrozenContractDocument } from "@/lib/contracts/types";
import type { EditableInstallment } from "@/components/contracts/contract-payment-plan";
import { useSupabase } from "@/providers/supabase-provider";

export function ContractReviewWorkspace(props: {
  organizationId: string;
  bookingId: string;
  versions: {
    id: string;
    version_number: number;
    status: ContractStatus;
    processing_status: string;
    special_terms: string;
    payment_terms?: string;
    include_internal_notes: boolean;
    customer_facing_notes: string | null;
  }[];
  preview: FrozenContractDocument | null;
  contentHash: string | null;
  emailConfigured: boolean;
  inviteDelivery: { status: string; lastError: string | null; toEmail: string } | null;
  acceptance: { fullName: string; acceptedAt: string } | null;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const supabase = useSupabase();
  const current = props.versions[0]!;
  const acceptedVersion = props.versions.find((version) => version.status === "accepted");
  const processingKey = current.processing_status;
  const processingLabel =
    processingKey === "pdf_queued" ||
    processingKey === "pdf_generating" ||
    processingKey === "pdf_failed" ||
    processingKey === "email_queued" ||
    processingKey === "email_bounced" ||
    processingKey === "email_failed"
      ? t(`contracts.processing.${processingKey}`)
      : "";
  const statusBadgeVariant =
    current.status === "accepted"
      ? "default"
      : current.status === "cancelled" || current.status === "expired"
        ? "secondary"
        : current.status === "sent" || current.status === "viewed"
          ? "outline"
          : "secondary";
  const [special, setSpecial] = useState(current.special_terms);
  const [includeNotes, setIncludeNotes] = useState(current.include_internal_notes);
  const [facing, setFacing] = useState(current.customer_facing_notes ?? "");
  const [paymentTerms, setPaymentTerms] = useState(
    props.preview?.terms.paymentTerms || "Merk betaling med: Arrangementsdato og navn",
  );
  const [installments, setInstallments] = useState<EditableInstallment[]>(
    props.preview?.booking.installments ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(
    props.inviteDelivery && props.inviteDelivery.status !== "provider_accepted"
      ? props.inviteDelivery.lastError
      : null,
  );
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const doc = props.preview;
  const editable = current.status === "draft";

  const sendGaps = doc
    ? sendBlockingGaps({
        legalName: doc.issuer.legalName,
        orgNumber: doc.issuer.orgNumber,
        customerName: doc.customer.name,
        customerEmail: doc.customer.email,
        venueName: doc.booking.venueName,
        totalNok: doc.booking.totalNok,
        hasTemplate: Boolean(doc.terms.legalTerms),
        legalTermsApproved: true,
        contractsEnabled: true,
        featureFlag: true,
      }).missing
    : [];

  const previousStatus = useRef(current.status);

  useEffect(() => {
    if (previousStatus.current !== "accepted" && current.status === "accepted") {
      toast.success(t("contracts.customerAcceptedToast"));
    }
    previousStatus.current = current.status;
  }, [current.status, t]);

  useEffect(() => {
    const waitingForSignature =
      current.status === "sent" ||
      current.status === "viewed" ||
      (current.status === "accepted" && !props.acceptance);
    if (!waitingForSignature) return;
    const timer = window.setInterval(() => {
      router.refresh();
    }, 5000);
    const channel = supabase
      .channel(`contract-review:${current.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rental_contract_versions",
          filter: `id=eq.${current.id}`,
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [current.id, current.status, props.acceptance, router, supabase]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, name")
        .eq("organization_id", props.organizationId)
        .order("name");
      setVenues((data as { id: string; name: string }[] | null) ?? []);
    })();
  }, [props.organizationId, supabase]);

  function gapLabel(key: string) {
    switch (key) {
      case "featureFlag":
        return t("contracts.gap.featureFlag");
      case "contractsEnabled":
        return t("contracts.gap.contractsEnabled");
      case "legalTermsApproved":
        return t("contracts.gap.legalTermsApproved");
      case "template":
        return t("contracts.gap.template");
      case "issuerLegalName":
        return t("contracts.gap.issuerLegalName");
      case "issuerOrgNumber":
        return t("contracts.gap.issuerOrgNumber");
      case "customerName":
        return t("contracts.gap.customerName");
      case "customerEmail":
        return t("contracts.gap.customerEmail");
      case "venue":
        return t("contracts.gap.venue");
      case "price":
        return t("contracts.gap.price");
      default:
        return key;
    }
  }

  function showActionError(error: string) {
    const codes = parseSendBlockedError(error);
    if (codes) {
      toast.error(
        t("contracts.missingFields", { list: codes.map(gapLabel).join(", ") }),
      );
      return;
    }
    toast.error(error);
  }

  async function saveVenue() {
    if (!propertyId) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ property_id: propertyId })
        .eq("id", props.bookingId)
        .eq("organization_id", props.organizationId);
      if (error) toast.error(error.message);
      else {
        toast.success(t("common.toasts.saved"));
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      const result = await updateDraft({
        organizationId: props.organizationId,
        bookingId: props.bookingId,
        versionId: current.id,
        specialTerms: special,
        includeInternalNotes: includeNotes,
        customerFacingNotes: facing,
        paymentTerms,
        installments,
      });
      if (!result.ok) showActionError(result.error);
      else {
        toast.success(t("common.toasts.saved"));
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setBusy(true);
    try {
      if (editable) {
        const saved = await updateDraft({
          organizationId: props.organizationId,
          bookingId: props.bookingId,
          versionId: current.id,
          specialTerms: special,
          includeInternalNotes: includeNotes,
          customerFacingNotes: facing,
          paymentTerms,
          installments,
        });
        if (!saved.ok) {
          showActionError(saved.error);
          return;
        }
      }
      const result = await sendContract({
        organizationId: props.organizationId,
        bookingId: props.bookingId,
        versionId: current.id,
      });
      if (!result.ok) showActionError(result.error);
      else {
        setInviteUrl(result.inviteUrl);
        setEmailError(result.emailed ? null : result.emailError);
        if (result.emailed) toast.success(t("contracts.send"));
        else toast.error(t("contracts.emailNotDelivered", { error: result.emailError ?? "" }));
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-8">
      <AppPageHeader
        className="mb-0"
        compact
        detailLayout
        title={t("contracts.reviewTitle")}
        description={t("contracts.primaryHint")}
        backLink={{ href: "/app/bookings", label: t("bookings.backToBookings") }}
        actions={
          <>
            {editable ? (
              <>
                <Button type="button" variant="outline" disabled={busy} onClick={() => void save()}>
                  {t("common.actions.save")}
                </Button>
                <Button type="button" disabled={busy} onClick={() => void send()}>
                  {t("contracts.sendToCustomer")}
                </Button>
              </>
            ) : current.status === "sent" || current.status === "viewed" ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void withdrawOffer({
                    organizationId: props.organizationId,
                    bookingId: props.bookingId,
                    versionId: current.id,
                  }).then((r) => {
                    if (!r.ok) showActionError(r.error);
                    else router.refresh();
                  })
                }
              >
                {t("contracts.withdraw")}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={busy}
                onClick={() =>
                  void createRevision({
                    organizationId: props.organizationId,
                    bookingId: props.bookingId,
                  }).then((r) => {
                    if (!r.ok) showActionError(r.error);
                    else router.refresh();
                  })
                }
              >
                {t("contracts.newVersion")}
              </Button>
            )}
            {inviteUrl ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(inviteUrl).then(() => {
                    toast.success(t("contracts.inviteCopied"));
                  });
                }}
              >
                {t("contracts.copyInviteLink")}
              </Button>
            ) : null}
            {acceptedVersion ? (
              <a
                className={buttonVariants({ variant: "outline" })}
                href={`/api/contracts/staff-pdf?bookingId=${props.bookingId}&versionId=${acceptedVersion.id}`}
              >
                {t("contracts.downloadPdf")}
              </a>
            ) : null}
          </>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <p className="text-muted-foreground">
              {t("contracts.reviewVersion", { n: current.version_number })}
            </p>
            <Badge variant={statusBadgeVariant}>{t(`contracts.status.${current.status}`)}</Badge>
            {processingLabel ? (
              <p className="text-muted-foreground">{processingLabel}</p>
            ) : null}
            {current.status === "sent" || current.status === "viewed"
              ? props.inviteDelivery?.toEmail
                ? (
                    <p>
                      <span className="text-muted-foreground">{t("contracts.reviewSentTo")} </span>
                      <span className="font-medium">{props.inviteDelivery.toEmail}</span>
                    </p>
                  )
                : doc?.customer.email
                  ? (
                      <p>
                        <span className="text-muted-foreground">{t("contracts.reviewSentTo")} </span>
                        <span className="font-medium">{doc.customer.email}</span>
                      </p>
                    )
                  : null
              : null}
            {doc?.booking.reference ? (
              <p className="text-muted-foreground">{doc.booking.reference}</p>
            ) : null}
          </div>
        }
      />
      {inviteUrl ? (
        <p className="text-sm text-muted-foreground">{t("contracts.copyInviteHint")}</p>
      ) : null}

      {!props.emailConfigured && current.status !== "accepted" ? (
        <div
          className="rounded-lg border-2 border-amber-500/40 bg-amber-500/10 p-4 text-sm"
          role="status"
        >
          {t("contracts.emailNotConfigured")}
        </div>
      ) : null}
      {current.status === "accepted" ? (
        <div
          className="rounded-lg border-2 border-emerald-700/35 bg-emerald-500/10 p-4 text-sm"
          role="status"
        >
          {t("contracts.customerAccepted", {
            name: props.acceptance?.fullName || doc?.customer.name || "—",
            when: props.acceptance?.acceptedAt
              ? new Intl.DateTimeFormat("nb-NO", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(props.acceptance.acceptedAt))
              : "",
          })}
        </div>
      ) : emailError ||
        (props.inviteDelivery && props.inviteDelivery.status === "failed") ? (
        <div
          className="rounded-lg border-2 border-destructive/40 bg-destructive/10 p-4 text-sm"
          role="status"
        >
          {t("contracts.emailNotDelivered", {
            error: emailError || props.inviteDelivery?.lastError || "",
          })}
        </div>
      ) : null}

      {sendGaps.length ? (
        <div
          className="space-y-3 rounded-lg border-2 border-amber-500/40 bg-amber-500/10 p-4 text-sm"
          role="status"
        >
          <p className="font-medium">
            {t("contracts.missingFields", {
              list: sendGaps.map(gapLabel).join(", "),
            })}
          </p>
          {sendGaps.includes("issuerOrgNumber") ? (
            <p>
              {t("contracts.fillOrgNumber")}{" "}
              <Link href="/app/settings/organization" className="font-semibold underline">
                {t("contracts.orgSettings")}
              </Link>
            </p>
          ) : null}
          {sendGaps.includes("venue") ? (
            <div className="space-y-2">
              <p>{t("contracts.fillVenue")}</p>
              {venues.length ? (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-10 rounded-md border-2 border-rn-border-strong bg-background px-3 text-sm"
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                  >
                    <option value="">{t("properties.notSelected")}</option>
                    {venues.map((venue) => (
                      <option key={venue.id} value={venue.id}>
                        {venue.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy || !propertyId}
                    onClick={() => void saveVenue()}
                  >
                    {t("contracts.saveVenue")}
                  </Button>
                </div>
              ) : (
                <Link href="/app/settings/lokaler" className="font-semibold underline">
                  {t("properties.settingsVenues")}
                </Link>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {doc ? (
        <ContractDocumentView
          document={doc}
          acceptance={props.acceptance}
          paymentPlanEditable={editable}
          installments={installments}
          paymentTerms={paymentTerms}
          onInstallmentsChange={setInstallments}
          onPaymentTermsChange={setPaymentTerms}
        />
      ) : null}

      <div className={cn(RN_CARD_SHELL, "space-y-3 p-5")}>
        <p className="text-xs font-semibold uppercase tracking-wide text-rn-text-slate">
          {t("contracts.contractOnly")}
        </p>
        <label className="block text-sm font-medium">{t("contracts.specialTerms")}</label>
        <Textarea
          value={special}
          onChange={(e) => setSpecial(e.target.value)}
          disabled={!editable}
          rows={6}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeNotes}
            disabled={!editable}
            onChange={(e) => setIncludeNotes(e.target.checked)}
          />
          {t("contracts.includeNotes")}
        </label>
        <p className="text-xs text-muted-foreground">{t("contracts.notesStayPrivate")}</p>
        {includeNotes ? (
          <Textarea value={facing} onChange={(e) => setFacing(e.target.value)} disabled={!editable} />
        ) : null}
      </div>

      <section className="space-y-2">
        <h2 className="font-heading text-lg font-bold">{t("contracts.history")}</h2>
        <ul className="text-sm">
          {props.versions.map((version) => (
            <li key={version.id}>
              v{version.version_number} · {t(`contracts.status.${version.status}`)}
              {version.status === "accepted" ? (
                <>
                  {" "}
                  ·{" "}
                  <a
                    className="underline"
                    href={`/api/contracts/staff-pdf?bookingId=${props.bookingId}&versionId=${version.id}`}
                  >
                    {t("contracts.downloadPdf")}
                  </a>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
