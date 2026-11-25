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

  it("asks for an e-mailed code first, and creates nothing until the code is entered", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const user = userEvent.setup();
    render(<RegisterPage />);
    await fillDetails(user);
    await user.click(screen.getByRole("checkbox", { name: "Godta alle" }));
    await user.click(submit());
    expect(await screen.findByText("Bekreft e-posten din")).toBeTruthy();
    expect(screen.getByText(/kari@eksempel\.no/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/auth/register/code");
    expect(JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body)).toEqual({ email: "kari@eksempel.no" });
  });

  it("sends the code together with the details and agreements, and shows the server's error for a wrong code", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Koden er ugyldig" }) });
    const user = userEvent.setup();
    render(<RegisterPage />);
    await fillDetails(user);
    await user.click(screen.getByRole("checkbox", { name: "Godta alle" }));
    await user.click(submit());
    const codeField = (await screen.findByLabelText("Kode")) as HTMLInputElement;
    await user.type(codeField, "12a345678");
    expect(codeField.value).toBe("123456");
    await user.click(screen.getByRole("button", { name: "Bekreft og opprett konto" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]![0]).toBe("/api/auth/register");
    const body = JSON.parse((fetchMock.mock.calls[1]![1] as { body: string }).body);
    expect(body).toMatchObject({ acceptTerms: true, acceptPrivacy: true, acceptDpa: true, email: "kari@eksempel.no", code: "123456" });
    expect(await screen.findByText("Koden er ugyldig")).toBeTruthy();
  });

  it("stays on the form and shows the message when the e-mail already has an account", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Det finnes allerede en konto", exists: true }) });
    const user = userEvent.setup();
    render(<RegisterPage />);
    await fillDetails(user);
    await user.click(screen.getByRole("checkbox", { name: "Godta alle" }));
    await user.click(submit());
    expect(await screen.findByText("Det finnes allerede en konto")).toBeTruthy();
    expect(screen.queryByText("Bekreft e-posten din")).toBeNull();
  });

  it("goes back to the form with the details kept when the user wants to change the e-mail", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const user = userEvent.setup();
    render(<RegisterPage />);
    await fillDetails(user);
    await user.click(screen.getByRole("checkbox", { name: "Godta alle" }));
    await user.click(submit());
    await user.click(await screen.findByRole("button", { name: "Endre e-post" }));
    expect((screen.getByLabelText("E-post") as HTMLInputElement).value).toBe("kari@eksempel.no");
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
