import type { ReactNode } from "react";

/** Meta under tittel — kun organisasjonsdetalj. */
export function OrganizationDetailMeta({
  slug,
  items,
  badges,
}: {
  slug: string;
  items: string[];
  badges?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 org-detail-meta-wrap">
      <div className="org-detail-meta-row">
        <span className="org-detail-meta-slug">{slug}</span>
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      {badges ? (
        <div className="flex flex-wrap items-center gap-2">{badges}</div>
      ) : null}
    </div>
  );
}
