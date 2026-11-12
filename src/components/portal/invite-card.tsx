import type { CSSProperties } from "react";

import { FONTS, PALETTES, type InviteDesign } from "@/lib/portal/invite-rules";

export type InviteCardLabels = {
  invited: string;
  when: string;
  where: string;
  dress: string;
  rsvpBy: string; // already formatted, e.g. "Svar innen 1. juni"; empty when no deadline
  hostedAt: string; // e.g. "Arrangert hos Rønningen"; empty to hide
};

type CardDesign = Pick<
  InviteDesign,
  "templateKey" | "paletteKey" | "fontKey" | "headline" | "message" | "eventDateText" | "eventTimeText" | "placeText" | "dressCode"
>;

/**
 * The invitation as a guest (and the designer's preview) sees it. Pure markup: no hooks, no data, so it
 * renders the same in the portal, on the public guest page and in the preview. All sizes scale with the
 * card's own width (container units), so it looks right from a 280px phone to a desktop preview.
 * User text is rendered as text only.
 */
export function InviteCard({ design, labels }: { design: CardDesign; labels: InviteCardLabels }) {
  const p = PALETTES[design.paletteKey];
  const f = FONTS[design.fontKey];

  const root: CSSProperties = { containerType: "inline-size", width: "100%" };
  const heading: CSSProperties = {
    fontFamily: f.heading,
    fontStyle: f.headingStyle,
    fontWeight: f.headingWeight,
    color: p.ink,
    lineHeight: 1.08,
    overflowWrap: "anywhere",
  };
  const body: CSSProperties = { fontFamily: f.body, color: p.ink, overflowWrap: "anywhere" };
  const kicker: CSSProperties = { fontFamily: f.body, color: p.accent, fontSize: "3.4cqw", letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700 };
  const label: CSSProperties = { fontFamily: f.body, color: p.muted, fontSize: "3.2cqw", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 };
  const value: CSSProperties = { ...body, fontSize: "4.6cqw", lineHeight: 1.35 };

  const headline = design.headline.trim();
  const when = [design.eventDateText.trim(), design.eventTimeText.trim()].filter(Boolean).join(" · ");
  const place = design.placeText.trim();
  const dress = design.dressCode.trim();
  const message = design.message.trim();

  const details = (align: "center" | "left") => (
    <dl style={{ display: "grid", gap: "4cqw", textAlign: align, margin: 0 }}>
      {when ? (
        <div>
          <dt style={label}>{labels.when}</dt>
          <dd style={{ ...value, margin: "1cqw 0 0" }}>{when}</dd>
        </div>
      ) : null}
      {place ? (
        <div>
          <dt style={label}>{labels.where}</dt>
          <dd style={{ ...value, margin: "1cqw 0 0" }}>{place}</dd>
        </div>
      ) : null}
      {dress ? (
        <div>
          <dt style={label}>{labels.dress}</dt>
          <dd style={{ ...value, margin: "1cqw 0 0" }}>{dress}</dd>
        </div>
      ) : null}
    </dl>
  );

  const messageBlock = message ? (
    <p style={{ ...body, fontSize: "4.4cqw", lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap" }}>{message}</p>
  ) : null;

  const foot = (align: "center" | "left") =>
    labels.rsvpBy || labels.hostedAt ? (
      <div style={{ display: "grid", gap: "2cqw", textAlign: align }}>
        {labels.rsvpBy ? <p style={{ ...body, fontSize: "4cqw", fontWeight: 700, margin: 0, color: p.accent }}>{labels.rsvpBy}</p> : null}
        {labels.hostedAt ? <p style={{ ...body, fontSize: "3.2cqw", margin: 0, color: p.muted }}>{labels.hostedAt}</p> : null}
      </div>
    ) : null;

  const h1 = (size: string, extra?: CSSProperties) => (
    <h2 style={{ ...heading, fontSize: size, margin: 0, ...extra }}>{headline}</h2>
  );

  if (design.templateKey === "moderne") {
    return (
      <div style={{ ...root, background: p.bg, padding: "9cqw", display: "grid", gap: "7cqw", borderRadius: "3cqw" }}>
        <span aria-hidden style={{ display: "block", width: "14cqw", height: "1.4cqw", background: p.accent }} />
        <div style={{ display: "grid", gap: "3cqw" }}>
          <span style={kicker}>{labels.invited}</span>
          {h1("11cqw", { letterSpacing: "-0.02em", textAlign: "left" })}
        </div>
        {details("left")}
        {messageBlock}
        {foot("left")}
      </div>
    );
  }

  if (design.templateKey === "ramme") {
    return (
      <div style={{ ...root, background: p.accent, padding: "4.5cqw", borderRadius: "3.5cqw" }}>
        <div style={{ background: p.bg, borderRadius: "2.2cqw", padding: "9cqw 7cqw", display: "grid", gap: "6cqw", textAlign: "center" }}>
          <span style={kicker}>{labels.invited}</span>
          {h1("9.5cqw", { textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" })}
          {details("center")}
          {messageBlock}
          {foot("center")}
        </div>
      </div>
    );
  }

  if (design.templateKey === "stripe") {
    return (
      <div style={{ ...root, background: p.bg, borderRadius: "3cqw", overflow: "hidden" }}>
        <div style={{ background: p.accent, padding: "8cqw 9cqw", display: "grid", gap: "2cqw" }}>
          <span style={{ ...kicker, color: p.bg }}>{labels.invited}</span>
          <p style={{ fontFamily: f.heading, fontStyle: f.headingStyle, fontWeight: f.headingWeight, fontSize: "9cqw", lineHeight: 1.1, color: p.bg, margin: 0, overflowWrap: "anywhere" }}>
            {design.eventDateText.trim() || " "}
          </p>
        </div>
        <div style={{ padding: "9cqw", display: "grid", gap: "7cqw" }}>
          {h1("9cqw", { textAlign: "left" })}
          {details("left")}
          {messageBlock}
          {foot("left")}
        </div>
      </div>
    );
  }

  // klassisk
  return (
    <div style={{ ...root, background: p.bg, padding: "5cqw", borderRadius: "3cqw" }}>
      <div style={{ border: `1px solid ${p.accent}`, padding: "10cqw 8cqw", display: "grid", gap: "6cqw", textAlign: "center", borderRadius: "1.5cqw" }}>
        <span style={kicker}>{labels.invited}</span>
        {h1("10cqw", { textAlign: "center" })}
        <span aria-hidden style={{ display: "block", width: "16cqw", height: "1px", background: p.accent, margin: "0 auto" }} />
        {details("center")}
        {messageBlock}
        {foot("center")}
      </div>
    </div>
  );
}
