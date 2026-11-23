import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizationProfileForm } from "@/features/organization-profile/components/organization-profile-form";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import type { OrganizationProfileRow } from "@/lib/organizations/organization-profile";

const push = vi.fn();
const refresh = vi.fn();
const refreshOrganizations = vi.fn(async () => {});
const save = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
const toastMessage = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/hooks/use-current-organization", () => ({ useCurrentOrganization: () => ({ refreshOrganizations }) }));
vi.mock("@/i18n/client", () => ({ useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb" }) }));
vi.mock("sonner", () => ({ toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m), message: (m: string) => toastMessage(m) } }));
vi.mock("@/lib/organizations/actions/update-organization-profile", () => ({ updateOrganizationProfile: (input: unknown) => save(input) }));
// The address field talks to a map service; here it is a plain registered input.
vi.mock("@/components/forms/address-field", () => ({
  AddressField: ({ register, id }: { register: (name: "addressLine1") => object; id: string }) => <input id={id} {...register("addressLine1")} />,
}));

const organization: OrganizationProfileRow = {
  id: "org-1",
  name: "Test Lokale",
  slug: "test",
  logo_url: null,
  legal_name: "Test AS",
  tagline: null,
  org_number: "974760673",
  address_line1: "Gata 1",
  address_line2: null,
  postal_code: "3410",
  city: "Sylling",
  contact_email: "post@test.no",
  contact_phone: null,
  bank_account: null,
  payment_instructions: null,
};

const saveBar = () => screen.queryByRole("region", { name: "Du har ulagrede endringer" });

beforeEach(() => {
  vi.clearAllMocks();
  save.mockResolvedValue({ ok: true });
});
afterEach(cleanup);

describe("OrganizationProfileForm", () => {
  it("starts without a save bar and shows it, with a discard button, once something changes", async () => {
    const user = userEvent.setup();
    render(<OrganizationProfileForm organization={organization} />);
    expect(saveBar()).toBeNull();
    await user.type(screen.getByLabelText(/Slagord/), "Din fest");
    expect(saveBar()).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Forkast" }));
    expect((screen.getByLabelText(/Slagord/) as HTMLInputElement).value).toBe("");
    expect(saveBar()).toBeNull();
  });

  it("shows an error linked to the field for a wrong org number, and formats a right one on blur", async () => {
    const user = userEvent.setup();
    render(<OrganizationProfileForm organization={organization} />);
    const field = screen.getByLabelText(/Org\.nr\./) as HTMLInputElement;
    await user.clear(field);
    await user.type(field, "974760674");
    await user.tab();
    expect(await screen.findByText("Ugyldig organisasjonsnummer (9 siffer)")).toBeTruthy();
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(field.getAttribute("aria-describedby")).toBe("org-no-error");
    await user.clear(field);
    await user.type(field, "974760673");
    await user.tab();
    await waitFor(() => expect(field.value).toBe("974 760 673"));
    expect(screen.queryByText("Ugyldig organisasjonsnummer (9 siffer)")).toBeNull();
  });

  it("saves through the server action without sending any organization id, then resets and refreshes", async () => {
    const user = userEvent.setup();
    render(<OrganizationProfileForm organization={organization} />);
    await user.type(screen.getByLabelText(/Slagord/), "Din fest");
    await user.click(screen.getByRole("button", { name: "Lagre endringer" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const sent = save.mock.calls[0]![0] as Record<string, unknown>;
    expect(sent).toMatchObject({ name: "Test Lokale", tagline: "Din fest", orgNumber: "974760673" });
    expect(Object.keys(sent).some((k) => /^(id|organization_?id)$/i.test(k))).toBe(false);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Organisasjonsprofil lagret"));
    expect(refreshOrganizations).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
    await waitFor(() => expect(saveBar()).toBeNull());
    expect(push).not.toHaveBeenCalled();
  });

  it("does not call the server when the form is invalid", async () => {
    const user = userEvent.setup();
    render(<OrganizationProfileForm organization={organization} />);
    await user.clear(screen.getByLabelText(/Visningsnavn/));
    await user.click(screen.getByRole("button", { name: "Lagre endringer" }));
    expect(await screen.findByText(/Navn må være minst 2 tegn/)).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
  });

  it("shows the server's field errors next to the fields and keeps the form dirty", async () => {
    save.mockResolvedValueOnce({ ok: false, error: "Kunne ikke lagre", fieldErrors: { city: "Poststed er ugyldig" } });
    const user = userEvent.setup();
    render(<OrganizationProfileForm organization={organization} />);
    await user.type(screen.getByLabelText(/Slagord/), "x");
    await user.click(screen.getByRole("button", { name: "Lagre endringer" }));
    expect(await screen.findByText("Poststed er ugyldig")).toBeTruthy();
    expect(toastError).toHaveBeenCalledWith("Kunne ikke lagre");
    expect(saveBar()).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("in setup mode saves and continues to the venues step when the profile is complete", async () => {
    const user = userEvent.setup();
    render(<OrganizationProfileForm organization={organization} setupMode />);
    await user.click(screen.getByRole("button", { name: "Lagre og fortsett til lokaler" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app/settings/lokaler"));
  });

  it("in setup mode stays on the page with a message when required details are missing", async () => {
    const user = userEvent.setup();
    render(<OrganizationProfileForm organization={{ ...organization, org_number: null }} setupMode />);
    await user.click(screen.getByRole("button", { name: "Lagre og fortsett til lokaler" }));
    await waitFor(() => expect(toastMessage).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });

  it("warns when the logo address does not show an image", () => {
    render(<OrganizationProfileForm organization={{ ...organization, logo_url: "https://eksempel.no/" }} />);
    fireEvent.error(screen.getByAltText("Forhåndsvisning av logo"));
    expect(screen.getByText(/Adressen viser ikke et bilde/)).toBeTruthy();
  });
});
