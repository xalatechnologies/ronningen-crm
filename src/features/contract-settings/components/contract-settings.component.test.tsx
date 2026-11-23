import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContractSettingsCard } from "@/features/contract-settings/components/contract-settings-card";
import { PortalSettingsCard } from "@/features/contract-settings/components/portal-settings-card";
import { ReadinessCard } from "@/features/contract-settings/components/readiness-card";
import { TemplateEditor } from "@/features/contract-settings/components/template-editor";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

const setPilot = vi.fn();
const ensureTemplate = vi.fn();
const setPortal = vi.fn();
const saveVersion = vi.fn();
const refresh = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("@/lib/contracts/actions", () => ({
  setContractsPilotSettings: (i: unknown) => setPilot(i),
  ensureDefaultContractTemplate: (id: string) => ensureTemplate(id),
}));
vi.mock("@/lib/portal/actions", () => ({ setPortalSettings: (i: unknown) => setPortal(i) }));
vi.mock("@/lib/contracts/templates", () => ({
  saveTemplateVersion: (i: unknown) => saveVersion(i),
  uploadSignature: vi.fn(),
  createTemplateFromCopy: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) } }));
vi.mock("@/i18n/client", () => ({ useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb" }) }));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("ReadinessCard", () => {
  const base = { contractsEnabled: true, termsApproved: true, hasTemplate: true, emailConfigured: true };

  it("says ready when everything is set", () => {
    render(<ReadinessCard {...base} />);
    expect(screen.getByText("Klar til utsendelse")).toBeTruthy();
    expect(screen.getByText("4 av 4 punkter ferdig")).toBeTruthy();
  });

  it("says what is missing when not ready", () => {
    render(<ReadinessCard {...base} termsApproved={false} />);
    expect(screen.getByText("Ikke klar til utsendelse ennå")).toBeTruthy();
    expect(screen.getByText("3 av 4 punkter ferdig")).toBeTruthy();
  });

  it("warns about e-mail without blocking", () => {
    render(<ReadinessCard {...base} emailConfigured={false} />);
    expect(screen.getByText("Klar til utsendelse")).toBeTruthy();
    expect(screen.getByText(/ikke invitasjon på e-post/)).toBeTruthy();
  });
});

describe("ContractSettingsCard", () => {
  const props = { organizationId: "org-1", contractsEnabled: false, legalApproved: false, hasTemplate: true };

  it("keeps Save off until something changes, then saves with the same action as before", async () => {
    setPilot.mockResolvedValue({ ok: true });
    render(<ContractSettingsCard {...props} />);
    const save = screen.getByRole("button", { name: "Lagre endringer" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.click(screen.getByRole("switch", { name: "Aktiver kontrakter for denne organisasjonen" }));
    fireEvent.click(screen.getByRole("switch", { name: "Jeg har gjennomgått vilkårene og godkjenner dem for utsendelse" }));
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    await waitFor(() => expect(setPilot).toHaveBeenCalledWith({ organizationId: "org-1", contractsEnabled: true, approveLegalTerms: true }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Lagre endringer" }) as HTMLButtonElement).disabled).toBe(true));
  });

  it("discards changes and shows server errors", async () => {
    setPilot.mockResolvedValue({ ok: false, error: "forbidden" });
    render(<ContractSettingsCard {...props} />);
    const enable = screen.getByRole("switch", { name: "Aktiver kontrakter for denne organisasjonen" });
    fireEvent.click(enable);
    fireEvent.click(screen.getByRole("button", { name: "Forkast" }));
    expect(enable.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(enable);
    fireEvent.click(screen.getByRole("button", { name: "Lagre endringer" }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("forbidden"));
  });

  it("offers to create the default template only when there is none", () => {
    const { rerender } = render(<ContractSettingsCard {...props} />);
    expect(screen.queryByRole("button", { name: "Opprett standardmal" })).toBeNull();
    rerender(<ContractSettingsCard {...props} hasTemplate={false} />);
    expect(screen.getByRole("button", { name: "Opprett standardmal" })).toBeTruthy();
  });
});

describe("PortalSettingsCard", () => {
  it("disables the dependent options while the portal is off and saves all three values", async () => {
    setPortal.mockResolvedValue({ ok: true });
    render(<PortalSettingsCard organizationId="org-1" enabled={false} autoInvite guestInvites={false} />);
    const auto = screen.getByRole("switch", { name: "Send invitasjon automatisk når avtalen er signert" }) as HTMLButtonElement;
    expect(auto.disabled).toBe(true);
    fireEvent.click(screen.getByRole("switch", { name: "Slå på kundeportalen" }));
    expect(auto.disabled).toBe(false);
    fireEvent.click(screen.getByRole("switch", { name: "Tillat kunder å sende invitasjoner til sine gjester" }));
    fireEvent.click(screen.getByRole("button", { name: "Lagre endringer" }));
    await waitFor(() => expect(setPortal).toHaveBeenCalledWith({ organizationId: "org-1", enabled: true, autoInvite: true, guestInvites: true }));
  });
});

describe("TemplateEditor", () => {
  const openRaw = () => fireEvent.click(screen.getByRole("tab", { name: "Ren tekst" }));
  const initial = { legalTerms: "Vilkår", paymentTerms: "Betal", acceptanceDeclaration: "Jeg godtar", closingLine: null, signerName: null, signaturePath: null };
  const props = { organizationId: "org-1", templateId: "t1", versionNumber: 6, initial };

  it("shows the version and has no save bar until something is edited", () => {
    render(<TemplateEditor {...props} />);
    expect(screen.getByText("Versjon 6")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Du har ulagrede endringer" })).toBeNull();
  });

  it("saves a new version with all fields and shows the new version number", async () => {
    saveVersion.mockResolvedValue({ ok: true, versionNumber: 7 });
    render(<TemplateEditor {...props} />);
    openRaw();
    fireEvent.change(screen.getByLabelText("Vilkår og betingelser"), { target: { value: "Nye vilkår" } });
    expect(screen.getByRole("region", { name: "Du har ulagrede endringer" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Lagre ny versjon" }));
    await waitFor(() =>
      expect(saveVersion).toHaveBeenCalledWith({
        organizationId: "org-1",
        templateId: "t1",
        legalTerms: "Nye vilkår",
        paymentTerms: "Betal",
        acceptanceDeclaration: "Jeg godtar",
        closingLine: "",
        signerName: "",
        signaturePath: null,
      }),
    );
    expect(await screen.findByText("Versjon 7")).toBeTruthy();
    expect(refresh).toHaveBeenCalled();
  });

  it("does not save empty terms and says why", () => {
    render(<TemplateEditor {...props} />);
    openRaw();
    fireEvent.change(screen.getByLabelText("Vilkår og betingelser"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Lagre ny versjon" }));
    expect(saveVersion).not.toHaveBeenCalled();
    expect(screen.getByText("Betingelser kan ikke være tomme.")).toBeTruthy();
  });

  it("discards edits", () => {
    render(<TemplateEditor {...props} />);
    openRaw();
    const terms = screen.getByLabelText("Vilkår og betingelser") as HTMLTextAreaElement;
    fireEvent.change(terms, { target: { value: "Endret" } });
    fireEvent.click(screen.getByRole("button", { name: "Forkast" }));
    expect((screen.getByLabelText("Vilkår og betingelser") as HTMLTextAreaElement).value).toBe("Vilkår");
  });

  it("explains a save conflict in plain words", async () => {
    saveVersion.mockResolvedValue({ ok: false, error: "template_conflict" });
    render(<TemplateEditor {...props} />);
    openRaw();
    fireEvent.change(screen.getByLabelText("Vilkår og betingelser"), { target: { value: "X" } });
    fireEvent.click(screen.getByRole("button", { name: "Lagre ny versjon" }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Noen andre lagret samtidig. Last siden på nytt og prøv igjen."));
  });

  describe("terms as sections", () => {
    const TERMS = "4. Betingelser\n• Reservasjon er gyldig.\n\n6. Husregler\nFølgende regler gjelder:\n\nTider og støy\n• Lukk vinduer kl. 01:00.";
    const withTerms = { ...props, initial: { ...initial, legalTerms: TERMS } };

    it("shows the terms as sections with headings and titled blocks", () => {
      render(<TemplateEditor {...withTerms} />);
      expect((screen.getByLabelText("Overskrift 1") as HTMLInputElement).value).toBe("4. Betingelser");
      expect((screen.getByLabelText("Overskrift 2") as HTMLInputElement).value).toBe("6. Husregler");
      expect((screen.getByLabelText("Undertittel (valgfri) (2.1)") as HTMLInputElement).value).toBe("Tider og støy");
      expect((screen.getByLabelText("Punkter, ett per linje (2.1)") as HTMLTextAreaElement).value).toBe("• Lukk vinduer kl. 01:00.");
      expect(screen.queryByRole("region", { name: "Du har ulagrede endringer" })).toBeNull();
    });

    it("saves the edited section back in the same text format", async () => {
      saveVersion.mockResolvedValue({ ok: true, versionNumber: 7 });
      render(<TemplateEditor {...withTerms} />);
      fireEvent.change(screen.getByLabelText("Punkter, ett per linje (2.1)"), { target: { value: "• Lukk vinduer kl. 01:00.\n• Lokalet forlates kl. 02:30." } });
      fireEvent.click(screen.getByRole("button", { name: "Lagre ny versjon" }));
      await waitFor(() =>
        expect(saveVersion).toHaveBeenCalledWith(
          expect.objectContaining({ legalTerms: "4. Betingelser\n• Reservasjon er gyldig.\n\n6. Husregler\nFølgende regler gjelder:\n\nTider og støy\n• Lukk vinduer kl. 01:00.\n• Lokalet forlates kl. 02:30." }),
        ),
      );
    });

    it("adds a numbered section and a titled block", () => {
      render(<TemplateEditor {...withTerms} />);
      fireEvent.click(screen.getAllByRole("button", { name: "Legg til seksjon" }).at(-1)!);
      expect((screen.getByLabelText("Overskrift 3") as HTMLInputElement).value).toBe("7. Ny seksjon");
      fireEvent.click(screen.getAllByRole("button", { name: "Legg til undertittel" }).at(-1)!);
      expect(screen.getByLabelText("Undertittel (valgfri) (3.1)")).toBeTruthy();
    });

    it("moves and removes sections", () => {
      render(<TemplateEditor {...withTerms} />);
      fireEvent.click(screen.getByRole("button", { name: "Flytt seksjon 2 opp" }));
      expect((screen.getByLabelText("Overskrift 1") as HTMLInputElement).value).toBe("6. Husregler");
      fireEvent.click(screen.getByRole("button", { name: "Fjern seksjon 1" }));
      expect((screen.getByLabelText("Overskrift 1") as HTMLInputElement).value).toBe("4. Betingelser");
      expect(screen.queryByLabelText("Overskrift 2")).toBeNull();
    });

    it("keeps the plain-text tab and the sections in step, and previews like the contract", () => {
      render(<TemplateEditor {...withTerms} />);
      openRaw();
      fireEvent.change(screen.getByLabelText("Vilkår og betingelser"), { target: { value: "1. Nytt\n• Punkt" } });
      fireEvent.click(screen.getByRole("tab", { name: "Seksjoner" }));
      expect((screen.getByLabelText("Overskrift 1") as HTMLInputElement).value).toBe("1. Nytt");
      fireEvent.click(screen.getByRole("tab", { name: "Forhåndsvisning" }));
      expect(screen.getByRole("heading", { name: "1. Nytt" })).toBeTruthy();
      expect(screen.getByText("• Punkt")).toBeTruthy();
    });

    it("does not lose a line break typed at the end of a block", () => {
      render(<TemplateEditor {...withTerms} />);
      const lines = screen.getByLabelText("Punkter, ett per linje (2.1)") as HTMLTextAreaElement;
      fireEvent.change(lines, { target: { value: "• Lukk vinduer kl. 01:00.\n" } });
      expect((screen.getByLabelText("Punkter, ett per linje (2.1)") as HTMLTextAreaElement).value).toBe("• Lukk vinduer kl. 01:00.\n");
    });
  });
});
