import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\//);
    await expect(page.locator("body")).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole("textbox", { name: /e-post|email/i })).toBeVisible();
  });

  test("register page loads", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test("forgot password page loads", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
  });
});

test.describe("Auth gates", () => {
  test("unauthenticated /app/dashboard redirects to login", async ({ page }) => {
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("unauthenticated /admin redirects to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
