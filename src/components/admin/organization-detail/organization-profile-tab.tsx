import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import { OrganizationDeletePanel } from "@/components/admin/organization-delete-panel";
import type { AdminOrganizationDetail } from "@/lib/admin/queries/organizations";
import { format } from "date-fns";
import { nb } from "date-fns/locale/nb";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "d. MMM yyyy HH:mm", { locale: nb });
}

export function OrganizationProfileTab({ org }: { org: AdminOrganizationDetail }) {
  return (
    <div className="flex flex-col gap-6">
      <AdminDataPanel title="Profil">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="app-text-muted">Juridisk navn</dt>
            <dd className="mt-1 font-heading text-app-md font-semibold">
              {org.legalName ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="app-text-muted">Org.nr.</dt>
            <dd className="mt-1 font-heading text-app-md font-semibold">
              {org.orgNumber ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="app-text-muted">Kontakt e-post</dt>
            <dd className="mt-1 font-heading text-app-md font-semibold">
              {org.contactEmail ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="app-text-muted">Faktura e-post</dt>
            <dd className="mt-1 font-heading text-app-md font-semibold">
              {org.billingEmail ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="app-text-muted">Opprettet</dt>
            <dd className="mt-1 font-heading text-app-md font-semibold">
              {formatDateTime(org.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="app-text-muted">Sist oppdatert</dt>
            <dd className="mt-1 font-heading text-app-md font-semibold">
              {formatDateTime(org.updatedAt)}
            </dd>
          </div>
          <div>
            <dt className="app-text-muted">Sist aktivitet</dt>
            <dd className="mt-1 font-heading text-app-md font-semibold">
              {formatDateTime(org.lastActivityAt)}
            </dd>
          </div>
          {org.isSuspended ? (
            <>
              <div>
                <dt className="app-text-muted">Suspendert</dt>
                <dd className="mt-1 font-heading text-app-md font-semibold">
                  {formatDateTime(org.suspendedAt)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="app-text-muted">Suspensjonsgrunn</dt>
                <dd className="mt-1 font-heading text-app-md font-semibold">
                  {org.suspendedReason ?? "—"}
                </dd>
              </div>
            </>
          ) : null}
        </dl>
      </AdminDataPanel>

      <OrganizationDeletePanel
        organizationId={org.id}
        organizationName={org.name}
        organizationSlug={org.slug}
      />
    </div>
  );
}
