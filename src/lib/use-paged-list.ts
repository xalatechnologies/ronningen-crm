import { useCallback, useState } from "react";

/**
 * Page state for a list that is cut into pages. `resetKey` identifies the current filter and search:
 * whenever it changes the list goes back to page 1, and the old page is forgotten for good
 * (switching back to an earlier filter does not bring an earlier page back).
 */
export function usePagedList<T>(items: readonly T[], pageSize: number, resetKey: string) {
  const [state, setState] = useState({ key: resetKey, page: 1 });
  if (state.key !== resetKey) {
    // Adjusting state while rendering because a prop changed is the documented React pattern for this.
    setState({ key: resetKey, page: 1 });
  }

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(state.key === resetKey ? state.page : 1, totalPages);

  const goToPage = useCallback(
    (next: number) => setState({ key: resetKey, page: Math.min(Math.max(1, next), totalPages) }),
    [resetKey, totalPages],
  );

  return {
    page,
    totalPages,
    pageItems: items.slice((page - 1) * pageSize, page * pageSize),
    goToPage,
  };
}
