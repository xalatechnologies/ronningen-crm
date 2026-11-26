import Link from "next/link";

import type { LegalContent } from "@/features/legal/lib/legal-content";

type Props = {
  content: LegalContent;
  version: string;
  labels: { back: string; draft: string; version: string; contents: string };
};

/** One legal document as a readable page: title, draft notice, a table of contents and numbered sections. */
export function LegalDocumentView({ content, version, labels }: Props) {
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 md:py-16">
      <div className="space-y-4">
        <Link href="/" className="text-app-sm font-semibold text-success underline-offset-4 hover:underline">
          ← {labels.back}
        </Link>
        <h1 className="font-heading text-[clamp(30px,5vw,44px)] leading-tight font-bold tracking-tight text-foreground">
          {content.title}
        </h1>
        <p className="text-app-base leading-relaxed text-muted-foreground">{content.intro}</p>
        <div className="flex flex-wrap items-center gap-3 text-app-sm">
          <span className="rounded-full bg-warning/15 px-3 py-1 font-semibold text-foreground">{labels.draft}</span>
          <span className="text-muted-foreground">{labels.version}</span>
          <span className="sr-only">{version}</span>
        </div>
      </div>

      <nav aria-label={labels.contents} className="rounded-xl border-2 border-rn-border-strong/40 bg-rn-surface-wash p-4">
        <p className="mb-2 text-app-sm font-bold tracking-wide text-muted-foreground uppercase">{labels.contents}</p>
        <ol className="grid gap-1 sm:grid-cols-2">
          {content.sections.map((section, i) => (
            <li key={section.heading}>
              <a href={`#section-${i + 1}`} className="text-app-sm text-foreground underline-offset-4 hover:text-success hover:underline">
                {section.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-8">
        {content.sections.map((section, i) => (
          <section key={section.heading} id={`section-${i + 1}`} className="scroll-mt-24 space-y-3">
            <h2 className="font-heading text-app-xl font-bold text-foreground">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-app-base leading-relaxed text-foreground/85">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
