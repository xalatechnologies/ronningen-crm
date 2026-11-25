import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProtectedLayout } from "@/components/layout/protected-layout";

const { passThrough } = vi.hoisted(() => ({
  passThrough: ({ children }: { children?: unknown }) => children as never,
}));

vi.mock("@/providers/organization-provider", () => ({ OrganizationProvider: passThrough }));
vi.mock("@/components/organizations/organization-gate", () => ({ OrganizationGate: passThrough }));
vi.mock("@/providers/notification-provider", () => ({ NotificationProvider: passThrough }));
vi.mock("@/components/pwa/install-provider", () => ({ InstallProvider: passThrough }));
vi.mock("@/providers/page-search-provider", () => ({ PageSearchProvider: passThrough }));
vi.mock("@/components/notifications/user-notification-listener", () => ({ UserNotificationListener: () => null }));
vi.mock("@/components/notifications/notification-ack-dialog", () => ({ NotificationAckDialog: () => null }));
vi.mock("@/components/notifications/notification-bell", () => ({ NotificationBell: () => <span>bell</span> }));
vi.mock("@/components/layout/skip-link", () => ({ SkipLink: () => null }));
vi.mock("@/components/layout/app-sidebar", () => ({ AppSidebar: () => <nav>sidebar</nav> }));
vi.mock("@/components/layout/app-header", () => ({ AppHeader: ({ children }: { children?: ReactNode }) => <header>header{children}</header> }));

afterEach(cleanup);

describe("ProtectedLayout", () => {
  it("shows the menu, header and notifications in the normal app", () => {
    render(<ProtectedLayout>innhold</ProtectedLayout>);
    expect(screen.getByText("sidebar")).toBeTruthy();
    expect(screen.getByText(/header/)).toBeTruthy();
    expect(screen.getByText("bell")).toBeTruthy();
    expect(screen.getByText("innhold")).toBeTruthy();
  });

  it("in setup shows only the page: no menu, header or notifications", () => {
    render(<ProtectedLayout variant="setup">innhold</ProtectedLayout>);
    expect(screen.getByText("innhold")).toBeTruthy();
    expect(screen.queryByText("sidebar")).toBeNull();
    expect(screen.queryByText(/header/)).toBeNull();
    expect(screen.queryByText("bell")).toBeNull();
  });
});
