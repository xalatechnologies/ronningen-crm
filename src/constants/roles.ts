export const USER_ROLES = [
  "owner",
  "admin",
  "manager",
  "accountant",
  "viewer",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const DEFAULT_USER_ROLE: UserRole = "viewer";

export const SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Statuses platform admins can set manually (excludes Stripe-driven states). */
export const ADMIN_SETTABLE_SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "canceled",
] as const;

export type AdminSettableSubscriptionStatus =
  (typeof ADMIN_SETTABLE_SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_PLANS = [
  "standard",
  "starter",
  "pro",
  "enterprise",
] as const;

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const DEFAULT_SUBSCRIPTION_STATUS: SubscriptionStatus = "trialing";
export const DEFAULT_SUBSCRIPTION_PLAN: SubscriptionPlan = "standard";
