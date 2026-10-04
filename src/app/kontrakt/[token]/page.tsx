import type { Metadata } from "next";

import { ContractPortal } from "@/components/contracts/contract-portal";
import { getServerTranslation } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslation();
  return {
    title: t("contracts.portal.title"),
    referrer: "no-referrer",
  };
}

export default async function PublicContractPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ContractPortal token={token} />
    </div>
  );
}
