import type { useRouter } from "next/navigation";

/** Navigate to list after successful create; avoid refresh on the create page. */
export function redirectAfterCreate(
  router: ReturnType<typeof useRouter>,
  listPath: string,
) {
  router.replace(listPath);
}
