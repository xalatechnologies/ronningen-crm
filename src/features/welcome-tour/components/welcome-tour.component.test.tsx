import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WelcomeTour } from "@/features/welcome-tour/components/welcome-tour";
import { TourHelpButton } from "@/features/welcome-tour/components/tour-help-button";
import { TOUR_OPEN_EVENT } from "@/features/welcome-tour/lib/tour-events";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

const push = vi.fn();
const markSeen = vi.fn(async () => {});
const state: { role: string | null; pathname: string; account: { createdAt: string | null; tipsSeenAt: string | null } | null; ready: boolean } = {
  role: "owner",
  pathname: "/app/dashboard",
  account: null,
  ready: true,
};

vi.mock("@/i18n/client", () => ({ useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb" }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => state.pathname }));
vi.mock("@/hooks/use-current-organization", () => ({ useCurrentOrganization: () => ({ currentRole: state.role }) }));
vi.mock("@/features/welcome-tour/data/use-tour-account", () => ({ useTourAccount: () => ({ account: state.account, ready: state.ready, markSeen }) }));

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const newAccount = () => ({ createdAt: daysAgo(1), tipsSeenAt: null });
const dialog = () => screen.queryByRole("dialog");
const heading = () => screen.getByRole("heading", { level: 2 }).textContent;

function Page() {
  return (
    <>
      <nav>
        <a data-tour="nav-bookings" href="/app/bookings">Reservasjoner</a>
      </nav>
      <a data-tour="settings-organization" href="/app/settings/organization">Organisasjon</a>
      <TourHelpButton />
      <WelcomeTour impersonating={false} />
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  state.role = "owner";
  state.pathname = "/app/dashboard";
  state.account = newAccount();
  state.ready = true;
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ left: 20, top: 200, width: 200, height: 40, right: 220, bottom: 240, x: 20, y: 200, toJSON: () => ({}) });
  Element.prototype.scrollIntoView = vi.fn();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("WelcomeTour: who sees it", () => {
  it("opens by itself for a new account that has not seen it", () => {
    render(<Page />);
    expect(dialog()).toBeTruthy();
    expect(heading()).toBe("Velkommen!");
    expect(screen.getByText("Steg 1 av 11")).toBeTruthy();
  });

  it.each([
    ["an account that is older than 14 days", { createdAt: daysAgo(60), tipsSeenAt: null }, true],
    ["an account that has already seen it", { createdAt: daysAgo(1), tipsSeenAt: daysAgo(0) }, true],
    ["an account whose state could not be read", null, true],
    ["an account whose state is still loading", { createdAt: daysAgo(1), tipsSeenAt: null }, false],
  ])("does not open by itself for %s", (_label, account, ready) => {
    state.account = account;
    state.ready = ready;
    render(<Page />);
    expect(dialog()).toBeNull();
  });

  it("does not open by itself while support or an admin is looking in", () => {
    render(<WelcomeTour impersonating />);
    expect(dialog()).toBeNull();
  });

  it("leaves out steps the role cannot use", () => {
    state.role = "viewer";
    render(<Page />);
    expect(screen.getByText("Steg 1 av 8")).toBeTruthy();
  });
});

describe("WelcomeTour: moving through the steps", () => {
  it("goes next and previous, and moves to the page of the step", async () => {
    const user = userEvent.setup();
    render(<Page />);
    expect(screen.queryByRole("button", { name: "Forrige" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Neste" }));
    expect(heading()).toBe("Virksomhetsprofil");
    expect(screen.getByText("Steg 2 av 11")).toBeTruthy();
    expect(push).toHaveBeenCalledWith("/app/settings/organization");
    state.pathname = "/app/settings/organization"; // the router has taken the user there
    await user.click(screen.getByRole("button", { name: "Forrige" }));
    expect(heading()).toBe("Velkommen!");
    expect(push).toHaveBeenLastCalledWith("/app/dashboard");
  });

  it("does not navigate when the step is on the page the user is already on", async () => {
    const user = userEvent.setup();
    state.pathname = "/app/settings/organization";
    render(<Page />);
    await user.click(screen.getByRole("button", { name: "Neste" }));
    expect(push).not.toHaveBeenCalled();
  });

  it("says Done on the last step, and finishing saves it on the account", async () => {
    const user = userEvent.setup();
    render(<Page />);
    for (let i = 0; i < 10; i++) await user.click(screen.getByRole("button", { name: "Neste" }));
    expect(heading()).toBe("Du finner turen igjen her");
    expect(screen.queryByRole("button", { name: "Neste" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Ferdig" }));
    expect(markSeen).toHaveBeenCalledTimes(1);
    expect(dialog()).toBeNull();
  });
});

describe("WelcomeTour: pointing at the real thing", () => {
  it("draws a ring around the target and puts the card next to it, to the right for a side-bar item", async () => {
    const user = userEvent.setup();
    render(<Page />);
    expect(document.querySelector(".ring-success")).toBeNull(); // the welcome step points at nothing
    await user.click(screen.getByRole("button", { name: "Neste" }));
    await waitFor(() => expect(document.querySelector(".ring-success")).not.toBeNull());
    const ring = document.querySelector<HTMLElement>(".ring-success")!;
    expect(ring.getAttribute("aria-hidden")).toBe("true");
    expect(ring.style.left).toBe("16px"); // target left 20 minus the 4px padding
    await waitFor(() => expect(dialog()!.style.left).toBe("234px")); // target right 220 plus the gap of 14
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("uses the corner card and no ring when nothing can be pointed at", async () => {
    document.body.innerHTML = "";
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([] as unknown as DOMRectList);
    render(<WelcomeTour impersonating={false} />);
    await new Promise((r) => setTimeout(r, 300));
    expect(document.querySelector(".ring-success")).toBeNull();
    expect(dialog()!.style.left).toBe("");
    expect(dialog()!.className).toContain("bottom-3");
  });
});

describe("WelcomeTour: closing", () => {
  it("closes with the X button and saves it", async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole("button", { name: "Lukk turen" }));
    expect(dialog()).toBeNull();
    expect(markSeen).toHaveBeenCalledTimes(1);
  });

  it("closes with Esc and saves it", async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.keyboard("{Escape}");
    expect(dialog()).toBeNull();
    expect(markSeen).toHaveBeenCalledTimes(1);
  });

  it("does not come back by itself after it was closed", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Page />);
    await user.click(screen.getByRole("button", { name: "Lukk turen" }));
    rerender(<Page />);
    expect(dialog()).toBeNull();
  });
});

describe("WelcomeTour: the help button", () => {
  it("has an accessible name and a tooltip", () => {
    state.account = { createdAt: daysAgo(60), tipsSeenAt: daysAgo(30) };
    render(<Page />);
    const button = screen.getByRole("button", { name: "Vis velkomstturen" });
    expect(button.getAttribute("title")).toBe("Tips og hjelp");
  });

  it("opens the tour again from step 1 for any account, even one that has seen it", async () => {
    const user = userEvent.setup();
    state.account = { createdAt: daysAgo(60), tipsSeenAt: daysAgo(30) };
    render(<Page />);
    expect(dialog()).toBeNull();
    await user.click(screen.getByRole("button", { name: "Vis velkomstturen" }));
    expect(heading()).toBe("Velkommen!");
    expect(screen.getByText("Steg 1 av 11")).toBeTruthy();
    expect(markSeen).not.toHaveBeenCalled(); // only closing saves
  });

  it("opens from step 1 again after the user had moved on", async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole("button", { name: "Neste" }));
    act(() => {
      window.dispatchEvent(new Event(TOUR_OPEN_EVENT));
    });
    expect(heading()).toBe("Velkommen!");
  });
});

describe("WelcomeTour: accessibility", () => {
  it("is a non-modal dialog labelled by its title, with the text in a live region, and focus moves to it", async () => {
    const user = userEvent.setup();
    render(<Page />);
    const card = dialog()!;
    expect(card.getAttribute("aria-modal")).toBe("false");
    const title = screen.getByRole("heading", { level: 2 });
    expect(card.getAttribute("aria-labelledby")).toBe(title.id);
    expect(title.parentElement?.getAttribute("aria-live")).toBe("polite");
    await waitFor(() => expect(document.activeElement).toBe(card));
    await user.click(screen.getByRole("button", { name: "Neste" }));
    await waitFor(() => expect(document.activeElement).toBe(dialog()));
  });

  it("hides the dots from screen readers", () => {
    render(<Page />);
    const dots = document.querySelector('[aria-hidden="true"].flex.gap-1\\.5');
    expect(dots?.children.length).toBe(11);
  });
});
