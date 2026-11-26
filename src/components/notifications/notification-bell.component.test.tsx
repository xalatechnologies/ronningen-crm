import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

const push = vi.fn();
const markRead = vi.fn(async () => true);
const deleteAllNotifications = vi.fn(async () => true);
const toastSuccess = vi.fn();
const toastError = vi.fn();

const note = (id: string, read: string | null = null) => ({
  id,
  title: `Tittel ${id}`,
  body: "Tekst",
  category: "booking",
  priority: "normal",
  organization_id: "org-1",
  action_url: null,
  action_label: null,
  read_at: read,
  acknowledged_at: null,
  created_at: "2026-11-14T10:00:00Z",
});

const state = { notifications: [note("a"), note("b", "2026-11-15T10:00:00Z")] };

vi.mock("@/i18n/client", () => ({ useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb" }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({ toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) } }));
vi.mock("@/providers/notification-provider", () => ({
  useNotifications: () => ({
    scopedNotifications: state.notifications,
    unreadCount: state.notifications.filter((n) => !n.read_at).length,
    markRead,
    deleteAllNotifications,
    loading: false,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.notifications = [note("a"), note("b", "2026-11-15T10:00:00Z")];
  deleteAllNotifications.mockResolvedValue(true);
});
afterEach(cleanup);

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Varsler/ }));
}

describe("NotificationBell: clear all", () => {
  it("shows a 'Fjern alle' button in the dropdown when there are notifications", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    await openMenu(user);
    expect(await screen.findByRole("menuitem", { name: "Fjern alle" })).toBeTruthy();
  });

  it("shows no clear button when the list is empty", async () => {
    state.notifications = [];
    const user = userEvent.setup();
    render(<NotificationBell />);
    await openMenu(user);
    await screen.findByText("Ingen varsler ennå.");
    expect(screen.queryByRole("menuitem", { name: "Fjern alle" })).toBeNull();
  });

  it("asks first, with the count, and deletes nothing until confirmed", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    await openMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: "Fjern alle" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("Fjerne alle varsler?");
    expect(dialog.textContent).toContain("Alle 2 varslene fjernes for godt");
    expect(deleteAllNotifications).not.toHaveBeenCalled();
  });

  it("says it in the singular for one notification", async () => {
    state.notifications = [note("a")];
    const user = userEvent.setup();
    render(<NotificationBell />);
    await openMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: "Fjern alle" }));
    expect((await screen.findByRole("dialog")).textContent).toContain("Det ene varselet fjernes for godt");
  });

  it("deletes when confirmed and tells the user", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    await openMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: "Fjern alle" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(Array.from(dialog.querySelectorAll("button")).find((b) => b.textContent === "Fjern alle")!);
    await waitFor(() => expect(deleteAllNotifications).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Varslene er fjernet."));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("does nothing when cancelled", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    await openMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: "Fjern alle" }));
    await user.click(await screen.findByRole("button", { name: "Avbryt" }));
    expect(deleteAllNotifications).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("shows an error and does not claim success when deleting fails", async () => {
    deleteAllNotifications.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<NotificationBell />);
    await openMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: "Fjern alle" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(Array.from(dialog.querySelectorAll("button")).find((b) => b.textContent === "Fjern alle")!);
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Kunne ikke fjerne varslene. Prøv igjen."));
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
