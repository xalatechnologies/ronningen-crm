import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/i18n/client", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, number>) => {
      if (key === "common.pagination.pageOf") return `Page ${params?.current} / ${params?.total}`;
      if (key === "common.pagination.prev") return "Previous";
      if (key === "common.pagination.next") return "Next";
      return key;
    },
  }),
}));

import { ListPagination } from "@/components/ui/list-pagination";

describe("ListPagination", () => {
  afterEach(cleanup);

  it("shows the summary, the page label and moves one page at a time", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<ListPagination summary="Showing 11-20 of 27" page={2} totalPages={3} onPageChange={onPageChange} />);

    expect(screen.getByText("Showing 11-20 of 27")).toBeTruthy();
    expect(screen.getByText("Page 2 / 3")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Next/ }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);
    await user.click(screen.getByRole("button", { name: /Previous/ }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  it("disables Previous on the first page and Next on the last page", () => {
    const { rerender } = render(<ListPagination summary="s" page={1} totalPages={3} onPageChange={vi.fn()} />);
    expect((screen.getByRole("button", { name: /Previous/ }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<ListPagination summary="s" page={3} totalPages={3} onPageChange={vi.fn()} />);
    expect((screen.getByRole("button", { name: /Next/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("hides the controls for a single page unless alwaysShowControls is set", () => {
    const { rerender } = render(<ListPagination summary="s" page={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<ListPagination summary="s" page={1} totalPages={1} onPageChange={vi.fn()} alwaysShowControls />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});
