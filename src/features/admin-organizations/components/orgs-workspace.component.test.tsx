import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OrgsWorkspace } from "@/features/admin-organizations/components/orgs-workspace";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import type { AdminOrganizationRow } from "@/lib/admin/queries/organizations";

const unsuspend = vi.fn();
const suspend = vi.fn();
const extend = vi.fn();
const exportCsv = vi.fn();
const replace = vi.fn();
const push = vi.fn();
const refresh = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
let params = new URLSearchParams();

vi.mock("@/lib/admin/actions/organizations-bulk", () => ({
  bulkUnsuspendOrganizations: (ids: string[]) => unsuspend(ids),
  bulkSuspendOrganizations: (i: unknown) => suspend(i),
  bulkExtendTrial: (i: unknown) => extend(i),
  exportOrganizationsCsv: (ids: string[]) => exportCsv(ids),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push, refresh }), useSearchParams: () => params }));
vi.mock("sonner", () => ({ toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) } }));
vi.mock("@/i18n/client", () => ({ useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb" }) }));

const NOW = "2026-11-23T12:00:00Z";

const org = (id: string, over: Partial<AdminOrganizationRow> = {}): AdminOrganizationRow =>
  ({
    id,
    name: `Org ${id}`,
    slug: `slug-${id}`,
    subscriptionStatus: "active",
    subscriptionPlan: "standard",
    isSuspended: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    memberCount: 1,
    venueCount: 1,
    trialEnds: null,
    providerSubscriptionId: "sub_1",
    lastActivityAt: "2026-11-20T10:00:00Z",
    totalRevenue: 1000,
    unpaidRemaining: 0,
    bookingsLast30d: 0,
    health: { score: 90, tier: "healthy", factors: [] },
    billingEmail: null,
    contactEmail: null,
    orgNumber: null,
    ...over,
  }) as AdminOrganizationRow;

const render_ = (orgs: AdminOrganizationRow[]) => render(<OrgsWorkspace organizations={orgs} nowIso={NOW} billingEnabled />);
const rowNames = () => screen.getAllByRole("row").slice(1).map((r) => /Org [a-z0-9]+(?=slug)/.exec(r.textContent ?? "")?.[0]);

beforeEach(() => {
  vi.clearAllMocks();
  params = new URLSearchParams();
  Object.assign(URL, { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() });
});
afterEach(cleanup);

describe("OrgsWorkspace", () => {
  const orgs = [
    org("a", { name: "Org a", totalRevenue: 500, lastActivityAt: "2026-11-01T10:00:00Z" }),
    org("b", { name: "Org b", totalRevenue: 900, lastActivityAt: "2026-11-22T10:00:00Z" }),
    org("c", { name: "Org c", totalRevenue: 100, isSuspended: true, lastActivityAt: null }),
  ];

  it("shows the numbers, the filter counts, and the newest activity first", () => {
    render_(orgs);
    expect(screen.getByText("Totalt")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Alle 3/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Suspendert 1/ })).toBeTruthy();
    expect(rowNames()).toEqual(["Org b", "Org a", "Org c"]);
  });

  it("filters from the address and puts filter and search back into it", () => {
    params = new URLSearchParams("status=suspended");
    render_(orgs);
    expect(rowNames()).toEqual(["Org c"]);
    fireEvent.click(screen.getByRole("button", { name: /Aktive 2/ }));
    expect(replace).toHaveBeenCalledWith("/admin/organizations?status=active", { scroll: false });
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "slug-b" } });
    expect(replace).toHaveBeenLastCalledWith("/admin/organizations?status=suspended&q=slug-b", { scroll: false });
  });

  it("sorts when a column header is clicked and flips on a second click", () => {
    render_(orgs);
    fireEvent.click(screen.getByRole("button", { name: "Sorter etter Inntekt" }));
    expect(rowNames()).toEqual(["Org b", "Org a", "Org c"]);
    expect(screen.getByRole("columnheader", { name: /Inntekt/ }).getAttribute("aria-sort")).toBe("descending");
    fireEvent.click(screen.getByRole("button", { name: "Sorter etter Inntekt" }));
    expect(rowNames()).toEqual(["Org c", "Org a", "Org b"]);
    fireEvent.click(screen.getByRole("button", { name: "Sorter etter Navn" }));
    expect(rowNames()).toEqual(["Org a", "Org b", "Org c"]);
  });

  it("opens an organization when its row is clicked, but not when the checkbox is", () => {
    render_(orgs);
    fireEvent.click(screen.getByLabelText("Velg Org b"));
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("row")[1]!.querySelectorAll("td")[3]!);
    expect(push).toHaveBeenCalledWith(expect.stringContaining("/admin/organizations/"));
  });

  it("shows the bulk bar for a selection and clears it", () => {
    render_(orgs);
    expect(screen.queryByRole("region", { name: "Valgte organisasjoner" })).toBeNull();
    fireEvent.click(screen.getByLabelText("Velg alle"));
    const bar = screen.getByRole("region", { name: "Valgte organisasjoner" });
    expect(within(bar).getByText("3 valgt")).toBeTruthy();
    fireEvent.click(within(bar).getByRole("button", { name: "Fjern markering" }));
    expect(screen.queryByRole("region", { name: "Valgte organisasjoner" })).toBeNull();
  });

  it("unsuspends the selected organizations and clears the selection when all succeed", async () => {
    unsuspend.mockResolvedValue({ ok: true, results: [{ id: "c", ok: true }] });
    render_(orgs);
    fireEvent.click(screen.getByLabelText("Velg Org c"));
    fireEvent.click(screen.getByRole("button", { name: "Opphev suspensjon" }));
    await waitFor(() => expect(unsuspend).toHaveBeenCalledWith(["c"]));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(screen.queryByRole("region", { name: "Valgte organisasjoner" })).toBeNull();
    expect(refresh).toHaveBeenCalled();
  });

  it("reports honestly when some fail and keeps only those selected", async () => {
    unsuspend.mockResolvedValue({ ok: true, results: [{ id: "a", ok: true }, { id: "c", ok: false, error: "Kan ikke" }] });
    render_(orgs);
    fireEvent.click(screen.getByLabelText("Velg Org a"));
    fireEvent.click(screen.getByLabelText("Velg Org c"));
    fireEvent.click(screen.getByRole("button", { name: "Opphev suspensjon" }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringContaining("1 av 2 feilet")));
    expect(toastSuccess).not.toHaveBeenCalled();
    expect((screen.getByLabelText("Velg Org c") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Velg Org a") as HTMLInputElement).checked).toBe(false);
  });

  it("needs a reason to suspend and sends it with the selected ids", async () => {
    suspend.mockResolvedValue({ ok: true, results: [{ id: "a", ok: true }] });
    render_(orgs);
    fireEvent.click(screen.getByLabelText("Velg Org a"));
    fireEvent.click(screen.getByRole("button", { name: /^Suspender \(1\)/ }));
    const confirm = (await screen.findByRole("button", { name: "Suspender" })) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Begrunnelse"), { target: { value: "Manglende betaling" } });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    await waitFor(() => expect(suspend).toHaveBeenCalledWith({ organizationIds: ["a"], reason: "Manglende betaling" }));
  });

  it("extends the trial by a whole number of days", async () => {
    extend.mockResolvedValue({ ok: true, results: [{ id: "a", ok: true }] });
    render_(orgs);
    fireEvent.click(screen.getByLabelText("Velg Org a"));
    fireEvent.click(screen.getByRole("button", { name: "Utvid prøve" }));
    fireEvent.change(await screen.findByLabelText("Antall dager"), { target: { value: "14" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Utvid prøve" }).at(-1)!);
    await waitFor(() => expect(extend).toHaveBeenCalledWith({ organizationIds: ["a"], extraDays: 14 }));
  });

  it("exports everything from the header and only the selection from the bar", async () => {
    exportCsv.mockResolvedValue({ ok: true, csv: "a,b" });
    render_(orgs);
    fireEvent.click(screen.getByRole("button", { name: "Eksporter CSV" }));
    await waitFor(() => expect(exportCsv).toHaveBeenCalledWith([]));
    fireEvent.click(screen.getByLabelText("Velg Org b"));
    fireEvent.click(screen.getByRole("button", { name: /Eksporter valgte \(1\)/ }));
    await waitFor(() => expect(exportCsv).toHaveBeenLastCalledWith(["b"]));
  });

  it("cuts a long list into pages of 25", () => {
    const many = Array.from({ length: 30 }, (_, i) => org(String(i).padStart(2, "0"), { name: `Org ${String(i).padStart(2, "0")}`, lastActivityAt: `2026-10-${String((i % 28) + 1).padStart(2, "0")}T10:00:00Z` }));
    render_(many);
    expect(screen.getAllByRole("row")).toHaveLength(26);
    fireEvent.click(screen.getByRole("button", { name: /Neste/ }));
    expect(screen.getAllByRole("row")).toHaveLength(6);
  });

  it("shows empty states", () => {
    const { unmount } = render_([]);
    expect(screen.getByText("Ingen organisasjoner ennå")).toBeTruthy();
    unmount();
    params = new URLSearchParams("q=finnesikke");
    render_(orgs);
    expect(screen.getByText("Ingen treff i listen")).toBeTruthy();
  });

  it("marks an expired trial and a trial that ends soon", () => {
    render_([org("a", { subscriptionStatus: "trialing", trialEnds: "2026-11-20T10:00:00Z" }), org("b", { subscriptionStatus: "trialing", trialEnds: "2026-11-26T10:00:00Z" })]);
    expect(screen.getByText(/Utløpt/)).toBeTruthy();
    expect(screen.getByText(/om 3 døgn|om 3 dager/)).toBeTruthy();
  });
});
