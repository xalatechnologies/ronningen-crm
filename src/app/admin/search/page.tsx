import { AdminGlobalSearchWorkspace } from "@/components/admin/admin-global-search-workspace";
import { globalAdminSearch } from "@/lib/admin/queries/global-search";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function AdminSearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const results = query ? await globalAdminSearch(query) : null;

  return <AdminGlobalSearchWorkspace query={query} results={results} />;
}
