export const USER_ROLES = ["owner", "admin", "accountant", "viewer"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const DEFAULT_USER_ROLE: UserRole = "viewer";

/** Short labels for the app shell / header. */
export const ROLE_DISPLAY_LABELS: Record<UserRole, string> = {
  owner: "Hovedeier",
  admin: "Administrator",
  accountant: "Regnskap",
  viewer: "Lesertilgang",
};
