import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import RegisterPage from "@/app/auth/register/page";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

vi.mock("@/i18n/client", () => ({ useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb" }) }));
vi.mock("@/components/auth/auth-brand-mark", () => ({ AuthBrandMark: () => null }));

const fetchMock = vi.fn();
const submit = () => screen.getByRole("button", { name: "Opprett konto" }) as HTMLButtonElement;

async function fillDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Fullt navn"), "Kari Nordmann");
  await user.type(screen.getByLabelText("E-post"), "kari@eksempel.no");
  await user.type(screen.getByLabelText("Passord"), "hemmelig123");
  await user.type(screen.getByLabelText("Bekreft passord"), "hemmelig123");
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Stopp" }) });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("RegisterPage agreements", () => {
  it("keeps the button disabled until all three agreements are ticked", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    expect(submit().disabled).toBe(true);
    await user.click(screen.getByRole("checkbox", { name: /brukervilkårene/ }));
    await user.click(screen.getByRole("checkbox", { name: /personvernerklæringen/ }));
    expect(submit().disabled).toBe(true);
    await user.click(screen.getByRole("checkbox", { name: /databehandleravtalen/ }));
    expect(submit().disabled).toBe(false);
  });

  it("'Godta alle' ticks every agreement, and unticking one disables the button again", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await user.click(screen.getByRole("checkbox", { name: "Godta alle" }));
    expect(submit().disabled).toBe(false);
    await user.click(screen.getByRole("checkbox", { name: /personvernerklæringen/ }));
    expect(submit().disabled).toBe(true);
  });

  it("links each agreement to its page, opening in a new tab", () => {
    render(<RegisterPage />);
    const terms = screen.getByRole("link", { name: /brukervilkårene/ });
    expect(terms.getAttribute("href")).toBe("/vilkar");
    expect(terms.getAttribute("target")).toBe("_blank");
    expect(terms.getAttribute("rel")).toContain("noopener");
    expect(screen.getByRole("link", { name: /personvernerklæringen/ }).getAttribute("href")).toBe("/personvern");
    expect(screen.getByRole("link", { name: /databehandleravtalen/ }).getAttribute("href")).toBe("/databehandleravtale");
  });

  it("sends the accepted agreements to the server with the signup", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    await fillDetails(user);
    await user.click(screen.getByRole("checkbox", { name: "Godta alle" }));
    await user.click(submit());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body);
    expect(body).toMatchObject({ acceptTerms: true, acceptPrivacy: true, acceptDpa: true, email: "kari@eksempel.no" });
    expect(await screen.findByText("Stopp")).toBeTruthy();
  });

  it("shows and hides the passwords together", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    const password = screen.getByLabelText("Passord") as HTMLInputElement;
    expect(password.type).toBe("password");
    await user.click(screen.getByRole("button", { name: "Vis passord" }));
    expect(password.type).toBe("text");
    expect((screen.getByLabelText("Bekreft passord") as HTMLInputElement).type).toBe("text");
  });
});
