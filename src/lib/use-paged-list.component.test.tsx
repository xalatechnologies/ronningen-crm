import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { usePagedList } from "@/lib/use-paged-list";

const items = Array.from({ length: 27 }, (_, i) => i + 1);

describe("usePagedList", () => {
  it("cuts the list into pages and moves between them within bounds", () => {
    const { result } = renderHook(() => usePagedList(items, 10, "all"));
    expect(result.current.totalPages).toBe(3);
    expect(result.current.pageItems).toHaveLength(10);

    act(() => result.current.goToPage(3));
    expect(result.current.page).toBe(3);
    expect(result.current.pageItems).toEqual([21, 22, 23, 24, 25, 26, 27]);

    act(() => result.current.goToPage(99));
    expect(result.current.page).toBe(3);
    act(() => result.current.goToPage(0));
    expect(result.current.page).toBe(1);
  });

  it("goes back to page 1 when the key changes and does not bring an old page back", () => {
    const { result, rerender } = renderHook(({ k }) => usePagedList(items, 10, k), {
      initialProps: { k: "all" },
    });
    act(() => result.current.goToPage(3));
    expect(result.current.page).toBe(3);

    rerender({ k: "overdue" });
    expect(result.current.page).toBe(1);

    rerender({ k: "all" });
    expect(result.current.page).toBe(1);
  });

  it("clamps the page when the list gets shorter", () => {
    const { result, rerender } = renderHook(({ list }) => usePagedList(list, 10, "all"), {
      initialProps: { list: items },
    });
    act(() => result.current.goToPage(3));
    rerender({ list: items.slice(0, 12) });
    expect(result.current.totalPages).toBe(2);
    expect(result.current.page).toBe(2);
  });
});
