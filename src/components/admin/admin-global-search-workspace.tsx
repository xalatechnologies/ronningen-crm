"use client";

import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { Input } from "@/components/ui/input";
import type { GlobalSearchResults } from "@/lib/admin/queries/global-search";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminGlobalSearchWorkspace({
  query,
  results,
}: {
  query: string;
  results: GlobalSearchResults | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(query);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      router.push("/admin/search");
      return;
    }
    router.push(`/admin/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <AdminPageShell
      title="Søk"
      description="Søk på tvers av organisasjoner, brukere, kunder og bookinger."
    >
      <form onSubmit={handleSubmit} className="max-w-xl">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Søk…"
          aria-label="Globalt adminsøk"
        />
      </form>

      {results ? (
        <div className="mt-6 flex flex-col gap-6">
          {results.groups.length === 0 ? (
            <p className="app-text-muted">Ingen treff for «{results.query}».</p>
          ) : (
            results.groups.map((group) => (
              <AdminDataPanel key={group.type}>
                <h2 className="app-section-title">{group.type}</h2>
                <ul className="mt-4 divide-y divide-rn-border-strong/40">
                  {group.items.map((item) => (
                    <li key={item.id} className="py-3">
                      <Link
                        href={item.href}
                        className="font-medium text-success hover:underline"
                      >
                        {item.label}
                      </Link>
                      {item.sublabel ? (
                        <p className="text-app-xs text-muted-foreground">
                          {item.sublabel}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </AdminDataPanel>
            ))
          )}
        </div>
      ) : null}
    </AdminPageShell>
  );
}
