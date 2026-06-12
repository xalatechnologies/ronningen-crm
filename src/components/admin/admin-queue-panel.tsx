import Link from "next/link";

import {
  AdminLinkButton,
} from "@/components/admin/admin-action-button";
import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import type { AdminQueueItem } from "@/lib/admin/types";

export function AdminQueuePanel({
  title,
  emptyMessage,
  emptyLabel,
  items,
  viewAllHref,
}: {
  title: string;
  emptyMessage?: string;
  emptyLabel?: string;
  items: AdminQueueItem[];
  viewAllHref?: string;
}) {
  const empty = emptyMessage ?? emptyLabel ?? "Ingen elementer.";

  return (
    <AdminDataPanel
      title={title}
      action={viewAllHref ? <AdminLinkButton href={viewAllHref}>Se alle</AdminLinkButton> : undefined}
    >
      {items.length === 0 ? (
        <p className="mt-4 app-text-muted">{empty}</p>
      ) : (
        <ul className="mt-4 divide-y divide-rn-border-strong/40">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                {item.meta?.startsWith("mailto:") ? (
                  <a
                    href={item.meta}
                    className="font-medium text-success hover:underline"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    className="font-medium text-success hover:underline"
                  >
                    {item.label}
                  </Link>
                )}
                {item.sublabel ? (
                  <p className="truncate text-app-xs text-muted-foreground">
                    {item.sublabel}
                  </p>
                ) : null}
              </div>
              {item.meta && !item.meta.startsWith("mailto:") ? (
                <span className="shrink-0 text-app-xs text-muted-foreground">
                  {item.meta}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </AdminDataPanel>
  );
}
