import { LegalDocumentPage, legalMetadata } from "@/features/legal/components/legal-document-page";

export const generateMetadata = () => legalMetadata("dpa");

export default function Page() {
  return <LegalDocumentPage documentKey="dpa" />;
}
