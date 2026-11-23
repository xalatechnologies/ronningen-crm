import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CalendarFeedPanel } from "@/features/integrations/components/calendar-feed-panel";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import type { FeedRow } from "@/lib/calendar/feed-actions";

const enable = vi.fn();
const rotate = vi.fn();
const disable = vi.fn();
const refresh = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
const writeText = vi.fn();

vi.mock("@/lib/calendar/feed-actions", () => ({
  enableCalendarFeed: (id: string) => enable(id),
  rotateCalendarFeed: (id: string) => rotate(id),
  disableCalendarFeed: (id: string) => disable(id),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) } }));
vi.mock("@/i18n/client", () => ({ useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb-NO" }) }));

const feed = (token = "tok123456789"): FeedRow => ({
  id: "f1",
  organizationId: "org-1",
  token,
  createdAt: "2026-08-27T14:03:00Z",
  updatedAt: "2026-08-27T14:03:00Z",
  lastAccessedAt: null,
  rotatedAt: null,
});

const props = { organizationId: "org-1", organizationName: "Rønningen", origin: "https://eventmanager.no/" };

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(navigator, { clipboard: { writeText } });
  writeText.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe("CalendarFeedPanel", () => {
  it("shows the status, a masked address and 'never' for values that are missing", () => {
    render(<CalendarFeedPanel {...props} initialFeed={feed()} />);
    expect(screen.getByText("Aktiv")).toBeTruthy();
    const input = screen.getByLabelText("Feed-URL") as HTMLInputElement;
    expect(input.value).not.toContain("tok123456789");
    expect(input.value).toContain("/bookings.ics");
    expect(screen.getAllByText("Aldri").length).toBe(2); // rotated and last fetched
  });

  it("describes the feed for any calendar tool and names no other company's product", () => {
    render(<CalendarFeedPanel {...props} initialFeed={feed()} />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("din egen kalender");
    expect(text).not.toContain("Digilist");
  });

  it("reveals the full address and copies it even while masked", async () => {
    render(<CalendarFeedPanel {...props} initialFeed={feed()} />);
    fireEvent.click(screen.getByRole("button", { name: "Kopier" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://eventmanager.no/api/calendar/tok123456789/bookings.ics"));
    expect(toastSuccess).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Vis" }));
    expect((screen.getByLabelText("Feed-URL") as HTMLInputElement).value).toBe("https://eventmanager.no/api/calendar/tok123456789/bookings.ics");
  });

  it("asks before rotating and only rotates after the confirmation", async () => {
    rotate.mockResolvedValue({ ok: true, feed: feed("newtoken0000") });
    render(<CalendarFeedPanel {...props} initialFeed={feed()} />);
    fireEvent.click(screen.getByRole("button", { name: "Roter token" }));
    expect(rotate).not.toHaveBeenCalled();
    expect(await screen.findByText("Rotere token?")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Roter token" }).at(-1)!);
    await waitFor(() => expect(rotate).toHaveBeenCalledWith("org-1"));
    await waitFor(() => expect((screen.getByLabelText("Feed-URL") as HTMLInputElement).value).toContain("newtoken0000"));
    expect(refresh).toHaveBeenCalled();
  });

  it("asks before disabling and then shows the not-enabled state", async () => {
    disable.mockResolvedValue({ ok: true });
    render(<CalendarFeedPanel {...props} initialFeed={feed()} />);
    fireEvent.click(screen.getByRole("button", { name: "Deaktiver" }));
    expect(disable).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "Deaktiver" }).at(-1)!);
    await waitFor(() => expect(disable).toHaveBeenCalledWith("org-1"));
    expect(await screen.findByText("Ikke aktivert")).toBeTruthy();
    // The dialog may still be closing and hiding the page from the accessibility tree, so wait for the button.
    expect(await screen.findByRole("button", { name: "Aktiver kalender-feed" })).toBeTruthy();
  });

  it("enables the feed from the empty state and shows the new address", async () => {
    enable.mockResolvedValue({ ok: true, feed: feed("fresh0000000") });
    render(<CalendarFeedPanel {...props} initialFeed={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Aktiver kalender-feed" }));
    await waitFor(() => expect((screen.getByLabelText("Feed-URL") as HTMLInputElement).value).toContain("fresh0000000"));
    expect(await screen.findByText("Aktiv")).toBeTruthy();
  });

  it("shows an error and keeps the old state when rotating fails", async () => {
    rotate.mockResolvedValue({ ok: false, error: "nope" });
    render(<CalendarFeedPanel {...props} initialFeed={feed()} />);
    fireEvent.click(screen.getByRole("button", { name: "Roter token" }));
    fireEvent.click((await screen.findAllByRole("button", { name: "Roter token" })).at(-1)!);
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect((screen.getByLabelText("Feed-URL") as HTMLInputElement).value).not.toContain("newtoken");
  });
});
