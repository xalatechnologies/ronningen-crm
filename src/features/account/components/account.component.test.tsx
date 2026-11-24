import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AccountSummary } from "@/features/account/components/account-summary";
import { AccountDeleteSection } from "@/features/account/components/delete-section";
import { PasswordCard } from "@/features/account/components/password-card";
import { ProfileCard } from "@/features/account/components/profile-card";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

const update = vi.fn();
const eq = vi.fn();
const resetPassword = vi.fn();
const refresh = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
const deleteOwnAccount = vi.fn();
const signOutToLogin = vi.fn();

const supabase = {
  from: () => ({ update: (v: unknown) => (update(v), { eq: (c: string, id: string) => eq(c, id) }) }),
  auth: { resetPasswordForEmail: (e: string, o: unknown) => resetPassword(e, o) },
};

vi.mock("@/providers/supabase-provider", () => ({ useSupabase: () => supabase }));
vi.mock("@/hooks/use-auth-user", () => ({ useAuthUser: () => ({ user: { id: "u1", email: "eva@x.no" } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) } }));
vi.mock("@/i18n/client", () => ({ useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb" }) }));
vi.mock("@/lib/auth/actions/delete-account", () => ({ deleteOwnAccount: (e: string) => deleteOwnAccount(e) }));
vi.mock("@/lib/auth/sign-out", () => ({ signOutToLogin: (c: unknown) => signOutToLogin(c) }));

beforeEach(() => {
  vi.clearAllMocks();
  eq.mockResolvedValue({ error: null });
  resetPassword.mockResolvedValue({ error: null });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("AccountSummary", () => {
  it("shows initials, the name and the e-mail, or only the e-mail when there is no name", () => {
    const { rerender } = render(<AccountSummary name="Eva Eier" email="eva@x.no" />);
    expect(screen.getByText("EE")).toBeTruthy();
    expect(screen.getByText("Eva Eier")).toBeTruthy();
    expect(screen.getByText("eva@x.no")).toBeTruthy();
    rerender(<AccountSummary name="" email="eva@x.no" />);
    expect(screen.getAllByText("eva@x.no")).toHaveLength(1);
  });
});

describe("ProfileCard", () => {
  it("keeps Save off until the name changes, then saves the trimmed name to the own profile", async () => {
    render(<ProfileCard initialFullName="Eva" email="eva@x.no" />);
    const save = screen.getByRole("button", { name: "Lagre navn" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Fullt navn"), { target: { value: "  Eva Eier " } });
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    await waitFor(() => expect(update).toHaveBeenCalledWith({ full_name: "Eva Eier" }));
    expect(eq).toHaveBeenCalledWith("id", "u1");
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect((screen.getByRole("button", { name: "Lagre navn" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("saves an empty name as null", async () => {
    render(<ProfileCard initialFullName="Eva" email="eva@x.no" />);
    fireEvent.change(screen.getByLabelText("Fullt navn"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Lagre navn" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith({ full_name: null }));
  });

  it("refuses a name that is too long and says why", () => {
    render(<ProfileCard initialFullName="Eva" email="eva@x.no" />);
    fireEvent.change(screen.getByLabelText("Fullt navn"), { target: { value: "a".repeat(101) } });
    expect(screen.getByRole("alert").textContent).toContain("maks 100");
    expect((screen.getByRole("button", { name: "Lagre navn" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows an error and keeps Save available when saving fails", async () => {
    eq.mockResolvedValue({ error: { message: "nope" } });
    render(<ProfileCard initialFullName="Eva" email="eva@x.no" />);
    fireEvent.change(screen.getByLabelText("Fullt navn"), { target: { value: "Eva E" } });
    fireEvent.click(screen.getByRole("button", { name: "Lagre navn" }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect((screen.getByRole("button", { name: "Lagre navn" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows the e-mail as read only", () => {
    render(<ProfileCard initialFullName="Eva" email="eva@x.no" />);
    const email = screen.getByLabelText("E-post") as HTMLInputElement;
    expect(email.value).toBe("eva@x.no");
    expect(email.readOnly).toBe(true);
  });
});

describe("PasswordCard", () => {
  it("sends the reset link to the own address, then waits before allowing another", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<PasswordCard email="eva@x.no" />);
    fireEvent.click(screen.getByRole("button", { name: "Send lenke for nytt passord" }));
    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith("eva@x.no", expect.objectContaining({ redirectTo: expect.stringContaining("/auth/login") })));
    const waiting = await screen.findByRole("button", { name: /Send på nytt om \d+ s/ });
    expect((waiting as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("eva@x.no");
    // Async advance lets React run the effect that starts the countdown interval, even on a slow runner.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000);
    });
    const again = await screen.findByRole("button", { name: "Send lenken på nytt" });
    expect((again as HTMLButtonElement).disabled).toBe(false);
  });

  it("does not start a cooldown when sending fails", async () => {
    resetPassword.mockResolvedValue({ error: { message: "rate" } });
    render(<PasswordCard email="eva@x.no" />);
    fireEvent.click(screen.getByRole("button", { name: "Send lenke for nytt passord" }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect((screen.getByRole("button", { name: "Send lenke for nytt passord" }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("AccountDeleteSection", () => {
  it("explains what blocks deletion and keeps the delete button off", () => {
    render(
      <AccountDeleteSection
        email="eva@x.no"
        eligible={false}
        blockers={[{ code: "last_owner", organizationId: "o1", message: "Du er siste hovedeier." } as never]}
      />,
    );
    expect(screen.getByText("Kontoen kan ikke slettes ennå:")).toBeTruthy();
    expect(screen.getByText("Du er siste hovedeier.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Slett kontoen min" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("link", { name: "Gå til Team" }).getAttribute("href")).toBe("/app/settings/team");
  });

  it("deletes only after the exact e-mail is typed, then signs out", async () => {
    deleteOwnAccount.mockResolvedValue({ ok: true });
    render(<AccountDeleteSection email="eva@x.no" eligible blockers={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Slett kontoen min" }));
    fireEvent.change(await screen.findByLabelText("Skriv inn e-postadressen din for å bekrefte"), { target: { value: "feil@x.no" } });
    fireEvent.click(screen.getByRole("button", { name: "Ja, slett kontoen min" }));
    expect(deleteOwnAccount).not.toHaveBeenCalled();
    expect(await screen.findByText(/stemmer ikke/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Skriv inn e-postadressen din for å bekrefte"), { target: { value: "EVA@x.no" } });
    fireEvent.click(screen.getByRole("button", { name: "Ja, slett kontoen min" }));
    await waitFor(() => expect(deleteOwnAccount).toHaveBeenCalledWith("EVA@x.no"));
    await waitFor(() => expect(signOutToLogin).toHaveBeenCalled());
  });
});
