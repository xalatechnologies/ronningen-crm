import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CreateOrganizationForm } from "@/components/organizations/create-organization-form";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

const createOrganizationForUser = vi.fn();
const refreshOrganizations = vi.fn(async () => {});
const toastError = vi.fn();
const toastSuccess = vi.fn();
const welcome = vi.fn();
const auth = { user: { id: "user-1" } as { id: string } | null, loading: false };

vi.mock("@/i18n/client", () => ({ useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb" }) }));
vi.mock("@/providers/supabase-provider", () => ({ useSupabase: () => ({}) }));
vi.mock("@/hooks/use-auth-user", () => ({ useAuthUser: () => auth }));
vi.mock("@/hooks/use-current-organization", () => ({ useCurrentOrganization: () => ({ refreshOrganizations }) }));
vi.mock("sonner", () => ({ toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) } }));
vi.mock("@/lib/notifications/actions/welcome", () => ({ triggerWelcomeNotification: (input: unknown) => welcome(input) }));
vi.mock("@/lib/organizations/organization-queries", () => ({
  createOrganizationForUser: (...args: unknown[]) => createOrganizationForUser(...args),
  toOrganizationError: (error: unknown, fallback: string) => ({ message: error instanceof Error ? error.message : fallback }),
}));

const assign = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { id: "user-1" };
  auth.loading = false;
  createOrganizationForUser.mockResolvedValue({ organization: { name: "Test AS" }, created: true });
  vi.stubGlobal("location", { ...window.location, assign });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CreateOrganizationForm", () => {
  it("shows the name field with its hint and a 'Fortsett' button", () => {
    render(<CreateOrganizationForm />);
    const field = screen.getByLabelText("Organisasjonsnavn");
    expect(field.getAttribute("aria-describedby")).toBe("organization-name-hint");
    expect(screen.getByText(/Navnet vises på fakturaer/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fortsett" })).toBeTruthy();
  });

  it("creates the organization with the trimmed name for the signed-in user, then continues to the profile step", async () => {
    const user = userEvent.setup();
    render(<CreateOrganizationForm />);
    await user.type(screen.getByLabelText("Organisasjonsnavn"), "  Test AS  ");
    await user.click(screen.getByRole("button", { name: "Fortsett" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/app/settings/organization"));
    expect(createOrganizationForUser).toHaveBeenCalledWith(expect.anything(), "user-1", "Test AS");
    expect(refreshOrganizations).toHaveBeenCalled();
    expect(welcome).toHaveBeenCalledWith({ organizationName: "Test AS" });
  });

  it("does not create anything and tells the user when the name is empty", async () => {
    const user = userEvent.setup();
    render(<CreateOrganizationForm />);
    await user.click(screen.getByRole("button", { name: "Fortsett" }));
    expect(toastError).toHaveBeenCalledWith("Skriv inn et navn for organisasjonen.");
    expect(createOrganizationForUser).not.toHaveBeenCalled();
  });

  it("does not create anything when nobody is signed in", async () => {
    auth.user = null;
    const user = userEvent.setup();
    render(<CreateOrganizationForm />);
    await user.type(screen.getByLabelText("Organisasjonsnavn"), "Test AS");
    await user.click(screen.getByRole("button", { name: "Fortsett" }));
    expect(toastError).toHaveBeenCalledWith("Du må være innlogget for å opprette en organisasjon.");
    expect(createOrganizationForUser).not.toHaveBeenCalled();
  });

  it("shows the error and stays on the page when creating fails", async () => {
    createOrganizationForUser.mockRejectedValue(new Error("Navnet er opptatt"));
    const user = userEvent.setup();
    render(<CreateOrganizationForm />);
    await user.type(screen.getByLabelText("Organisasjonsnavn"), "Test AS");
    await user.click(screen.getByRole("button", { name: "Fortsett" }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Navnet er opptatt"));
    expect(assign).not.toHaveBeenCalled();
  });
});
