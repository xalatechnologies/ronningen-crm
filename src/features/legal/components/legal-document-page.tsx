import { LegalDocumentView } from "@/features/legal/components/legal-document-view";
import { legalContent } from "@/features/legal/lib/legal-content";
import { legalDocument, type LegalDocumentKey } from "@/features/legal/lib/legal-documents";
import { getServerTranslation } from "@/i18n/server";

export async function LegalDocumentPage({ documentKey }: { documentKey: LegalDocumentKey }) {
  const { t, locale } = await getServerTranslation();
  const { version } = legalDocument(documentKey);
  return (
    <LegalDocumentView
      content={legalContent(documentKey, locale)}
      version={version}
      labels={{
        back: t("auth.pages.legal.back"),
        draft: t("auth.pages.legal.draft"),
        version: t("auth.pages.legal.version", { version }),
        contents: t("auth.pages.legal.contents"),
      }}
    />
  );
}

export async function legalMetadata(documentKey: LegalDocumentKey) {
  const { locale } = await getServerTranslation();
  return { title: `${legalContent(documentKey, locale).title} | Event Manager` };
}
