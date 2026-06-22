import { safeInternalRedirect } from "@/lib/security/safe-redirect";

import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect } = await searchParams;
  const safeRedirect = safeInternalRedirect(redirect);

  return <LoginForm redirect={safeRedirect} />;
}
