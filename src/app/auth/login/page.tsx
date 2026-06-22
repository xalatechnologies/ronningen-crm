import { safeInternalRedirect } from "@/lib/security/safe-redirect";

import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect, error } = await searchParams;
  const safeRedirect = safeInternalRedirect(redirect);

  return <LoginForm redirect={safeRedirect} initialError={error ?? null} />;
}
