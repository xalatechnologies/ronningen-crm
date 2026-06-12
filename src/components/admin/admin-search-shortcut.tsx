"use client";

import { adminRoutes } from "@/config/admin-routes";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Invisible ⌘K / Ctrl+K shortcut — opens dedicated search page. */
export function AdminSearchShortcut() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push(adminRoutes.search);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
