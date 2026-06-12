import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { adminRoutes } from "@/config/admin-routes";

export type GlobalSearchResultGroup = {
  type: string;
  items: { id: string; label: string; sublabel?: string; href: string }[];
};

export type GlobalSearchResults = {
  query: string;
  groups: GlobalSearchResultGroup[];
};

export async function globalAdminSearch(
  query: string,
): Promise<GlobalSearchResults> {
  const admin = createSupabaseAdminClient();
  const q = `%${query.trim()}%`;
  const groups: GlobalSearchResultGroup[] = [];

  const [
    { data: orgs },
    { data: users },
    { data: customers },
    { data: bookings },
  ] = await Promise.all([
    admin
      .from("organizations")
      .select("id, name, slug, contact_email, billing_email")
      .or(`name.ilike.${q},slug.ilike.${q},contact_email.ilike.${q},billing_email.ilike.${q}`)
      .limit(8),
    admin
      .from("profiles")
      .select("id, email, full_name")
      .or(`email.ilike.${q},full_name.ilike.${q}`)
      .limit(8),
    admin
      .from("customers")
      .select("id, name, email, organization_id")
      .or(`name.ilike.${q},email.ilike.${q}`)
      .limit(8),
    admin
      .from("bookings")
      .select("id, booking_reference, organization_id, customers(name)")
      .or(`booking_reference.ilike.${q}`)
      .limit(8),
  ]);

  if (orgs?.length) {
    groups.push({
      type: "Organisasjoner",
      items: orgs.map((o) => ({
        id: o.id,
        label: o.name,
        sublabel: o.slug,
        href: adminRoutes.organizationDetail(o.id),
      })),
    });
  }

  if (users?.length) {
    groups.push({
      type: "Brukere",
      items: users.map((u) => ({
        id: u.id,
        label: u.full_name ?? u.email ?? u.id,
        sublabel: u.email ?? undefined,
        href: adminRoutes.userDetail(u.id),
      })),
    });
  }

  if (customers?.length) {
    groups.push({
      type: "Kunder",
      items: customers.map((c) => ({
        id: c.id,
        label: c.name,
        sublabel: c.email ?? undefined,
        href: adminRoutes.organizationDetail(c.organization_id),
      })),
    });
  }

  if (bookings?.length) {
    groups.push({
      type: "Bookinger",
      items: bookings.map((b) => {
        const customer = b.customers as { name?: string } | null;
        return {
          id: b.id,
          label: b.booking_reference ?? b.id,
          sublabel: customer?.name,
          href: adminRoutes.organizationDetail(b.organization_id),
        };
      }),
    });
  }

  return { query, groups };
}
