"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  moveItem,
  nextSectionNumber,
  parseTermsSections,
  removeItem,
  replaceItem,
  serializeTermsSections,
  type TermsGroup,
  type TermsSection,
} from "@/features/contract-settings/lib/terms-sections";
import { useTranslation } from "@/i18n/client";

type Props = { value: string; onChange: (text: string) => void };

const LABEL = "text-app-xs font-semibold text-muted-foreground";

function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={danger ? "text-muted-foreground hover:text-destructive" : "text-muted-foreground hover:text-foreground"}
    >
      {children}
    </Button>
  );
}

/**
 * Edits the terms as sections and blocks, the way the contract shows them. The text itself is still one string:
 * every edit is written back in the same format. The editor keeps its own copy while you type, so a trailing
 * line break is not eaten, and takes the text again only when it was changed somewhere else (the plain-text tab).
 */
export function StructuredTermsEditor({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [sections, setSections] = useState<TermsSection[]>(() => parseTermsSections(value));
  const emitted = useRef(value);

  useEffect(() => {
    if (value !== emitted.current) {
      emitted.current = value;
      setSections(parseTermsSections(value));
    }
  }, [value]);

  function commit(next: TermsSection[]) {
    setSections(next);
    const text = serializeTermsSections(next);
    emitted.current = text;
    onChange(text);
  }

  const patchSection = (index: number, patch: Partial<TermsSection>) => commit(replaceItem(sections, index, { ...sections[index]!, ...patch }));
  const patchGroup = (si: number, gi: number, patch: Partial<TermsGroup>) =>
    patchSection(si, { groups: replaceItem(sections[si]!.groups, gi, { ...sections[si]!.groups[gi]!, ...patch }) });

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl bg-muted/30 px-5 py-6">
        <div>
          <p className="font-medium text-foreground">{t("contracts.template.terms.empty")}</p>
          <p className="text-app-sm text-muted-foreground">{t("contracts.template.terms.emptyHint")}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => commit([{ heading: t("contracts.template.terms.newSection", { n: 1 }), intro: [], groups: [] }])}>
          <Plus className="size-4" aria-hidden />
          {t("contracts.template.terms.addSection")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section, si) => {
        const n = si + 1;
        return (
          <fieldset key={si} className="flex flex-col gap-4 rounded-xl p-4 ring-1 ring-foreground/10">
            <legend className="sr-only">{section.heading ?? t("contracts.template.terms.sectionHeading")}</legend>
            <div className="flex items-end gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <label htmlFor={`terms-heading-${si}`} className={LABEL}>
                  {t("contracts.template.terms.sectionHeading")} {n}
                </label>
                <Input id={`terms-heading-${si}`} value={section.heading ?? ""} onChange={(e) => patchSection(si, { heading: e.target.value })} className="font-semibold" />
              </div>
              <IconButton label={t("contracts.template.terms.moveSectionUp", { n })} disabled={si === 0} onClick={() => commit(moveItem(sections, si, -1))}>
                <ArrowUp className="size-4" aria-hidden />
              </IconButton>
              <IconButton label={t("contracts.template.terms.moveSectionDown", { n })} disabled={si === sections.length - 1} onClick={() => commit(moveItem(sections, si, 1))}>
                <ArrowDown className="size-4" aria-hidden />
              </IconButton>
              <IconButton danger label={t("contracts.template.terms.removeSection", { n })} onClick={() => commit(removeItem(sections, si))}>
                <Trash2 className="size-4" aria-hidden />
              </IconButton>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`terms-intro-${si}`} className={LABEL}>
                {t("contracts.template.terms.intro")} ({n})
              </label>
              <Textarea id={`terms-intro-${si}`} rows={3} value={section.intro.join("\n")} onChange={(e) => patchSection(si, { intro: e.target.value.split("\n") })} />
            </div>

            {section.groups.map((group, gi) => {
              const gn = gi + 1;
              return (
                <div key={gi} className="flex flex-col gap-3 rounded-lg bg-muted/30 p-3">
                  <div className="flex items-end gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <label htmlFor={`terms-group-title-${si}-${gi}`} className={LABEL}>
                        {t("contracts.template.terms.groupTitle")} ({n}.{gn})
                      </label>
                      <Input id={`terms-group-title-${si}-${gi}`} value={group.title ?? ""} onChange={(e) => patchGroup(si, gi, { title: e.target.value })} className="font-semibold" />
                    </div>
                    <IconButton label={t("contracts.template.terms.moveGroupUp", { n: gn })} disabled={gi === 0} onClick={() => patchSection(si, { groups: moveItem(section.groups, gi, -1) })}>
                      <ArrowUp className="size-4" aria-hidden />
                    </IconButton>
                    <IconButton label={t("contracts.template.terms.moveGroupDown", { n: gn })} disabled={gi === section.groups.length - 1} onClick={() => patchSection(si, { groups: moveItem(section.groups, gi, 1) })}>
                      <ArrowDown className="size-4" aria-hidden />
                    </IconButton>
                    <IconButton danger label={t("contracts.template.terms.removeGroup", { n: gn, section: n })} onClick={() => patchSection(si, { groups: removeItem(section.groups, gi) })}>
                      <Trash2 className="size-4" aria-hidden />
                    </IconButton>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`terms-group-lines-${si}-${gi}`} className={LABEL}>
                      {t("contracts.template.terms.groupLines")} ({n}.{gn})
                    </label>
                    <Textarea id={`terms-group-lines-${si}-${gi}`} rows={4} value={group.lines.join("\n")} onChange={(e) => patchGroup(si, gi, { lines: e.target.value.split("\n") })} />
                  </div>
                </div>
              );
            })}

            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => patchSection(si, { groups: [...section.groups, { title: "", lines: [] }] })}>
                <Plus className="size-4" aria-hidden />
                {t("contracts.template.terms.addGroup")}
              </Button>
            </div>
          </fieldset>
        );
      })}

      <div>
        <Button type="button" variant="outline" onClick={() => commit([...sections, { heading: t("contracts.template.terms.newSection", { n: nextSectionNumber(sections) }), intro: [], groups: [] }])}>
          <Plus className="size-4" aria-hidden />
          {t("contracts.template.terms.addSection")}
        </Button>
      </div>
    </div>
  );
}
