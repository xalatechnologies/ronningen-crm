import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MemberList } from "@/features/team/components/member-list";
import type { TeamMemberRow } from "@/features/team/lib/member-rules";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

vi.mock("@/i18n/client", () => ({
  useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb", formatDate: () => "10. juni 2026" }),
}));

const members: TeamMemberRow[] = [
  { id: "1", userId: "me", role: "owner", createdAtIso: "2026-06-10T00:00:00Z", fullName: "Eva Eier", email: "eva@x.no" },
  { id: "2", userId: "u2", role: "manager", createdAtIso: "2026-06-10T00:00:00Z", fullName: null, email: "per@x.no" },
  { id: "3", userId: "u3", role: "admin", createdAtIso: "2026-06-10T00:00:00Z", fullName: "Ann Admin", email: "ann@x.no" },
];

const base = { myUserId: "me", roleOptions: [{ value: "manager", label: "Leder" }], busyMemberId: null, onRoleChange: vi.fn() };

afterEach(cleanup);

describe("MemberList", () => {
  it("marks yourself, shows the count, and offers no actions on your own row", () => {
    render(<MemberList {...base} members={members} myRole="owner" onRemove={vi.fn()} />);
    expect(screen.getByText("Deg")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Fjern Eva Eier fra teamet" })).toBeNull();
  });

  it("falls back to the email as the name when there is no full name", () => {
    render(<MemberList {...base} members={members} myRole="owner" onRemove={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Fjern per@x.no fra teamet" })).toBeTruthy();
  });

  it("calls remove for a member the owner may remove", () => {
    const onRemove = vi.fn();
    render(<MemberList {...base} members={members} myRole="owner" onRemove={onRemove} />);
    fireEvent.click(screen.getByRole("button", { name: "Fjern Ann Admin fra teamet" }));
    expect(onRemove).toHaveBeenCalledWith(members[2]);
  });

  it("shows no remove buttons to an admin for the owner or another admin", () => {
    render(<MemberList {...base} members={members} myUserId="u3" myRole="admin" onRemove={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Fjern Eva Eier fra teamet" })).toBeNull();
    expect(screen.getByRole("button", { name: "Fjern per@x.no fra teamet" })).toBeTruthy();
  });
});
