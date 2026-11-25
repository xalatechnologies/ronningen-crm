import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SetupProgress } from "@/components/organizations/setup-progress";

afterEach(cleanup);

describe("SetupProgress", () => {
  const steps = ["Organisasjon", "Virksomhetsinfo", "Lokaler"];

  it("lists every step, marks only the current one, and says where the user is", () => {
    render(<SetupProgress steps={steps} current={2} label="Steg 2 av 3" />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((i) => i.textContent)).toEqual(steps);
    expect(items.map((i) => i.getAttribute("aria-current"))).toEqual([null, "step", null]);
    expect(screen.getByRole("list", { name: "Steg 2 av 3" })).toBeTruthy();
    expect(screen.getAllByText("Steg 2 av 3").length).toBeGreaterThan(0);
  });
});
