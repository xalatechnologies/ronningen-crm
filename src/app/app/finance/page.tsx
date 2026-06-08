import { FinanceSection } from "@/components/finance/finance-section";
import type { TransactionListItem } from "@/components/finance/types";
import { canManageFinance } from "@/lib/role-access";
import { resolveServerOrganizationContext } from "@/lib/organizations/organization-context";
import { requireServerOrganizationId } from "@/lib/organizations/require-server-organization-id";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function transactionYmd(isoOrDate: string): string {
  const s = String(isoOrDate ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

type RawTx = {
  id: string;
  property_id: string;
  type: string;
  category: string;
  description: string | null;
  amount: number;
  transaction_date: string;
  properties: { name: string } | null;
};

export default async function FinancePage() {
  const supabase = await createServerSupabaseClient();
  const orgId = await requireServerOrganizationId();
  const { role } = await resolveServerOrganizationContext(supabase);
  const canManageTransactions = canManageFinance(role);

  const { data: properties, error: pErr } = await supabase
    .from("properties")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name");

  const { data: rawList, error: tErr } = await supabase
    .from("transactions")
    .select(
      "id, property_id, type, category, description, amount, transaction_date, properties(name)",
    )
    .eq("organization_id", orgId)
    .order("transaction_date", { ascending: false })
    .limit(10000);

  const loadError = pErr?.message ?? tErr?.message ?? null;

  const nameByProperty = new Map(
    (properties ?? []).map((p) => [p.id, p.name] as const),
  );

  const transactions: TransactionListItem[] = (rawList ?? []).map((row) => {
    const r = row as unknown as RawTx;
    return {
      id: r.id,
      property_id: r.property_id,
      propertyName:
        r.properties?.name ?? nameByProperty.get(r.property_id) ?? null,
      type: r.type,
      category: r.category,
      description: r.description,
      amount: Number(r.amount),
      transaction_date: transactionYmd(r.transaction_date),
    };
  });

  return (
    <FinanceSection
      transactions={transactions}
      properties={properties ?? []}
      loadError={loadError}
      canManageTransactions={canManageTransactions}
    />
  );
}
