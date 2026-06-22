import { Suspense } from "react";

import { LoginForm } from "./login-form";

function LoginFormFallback() {
  return (
    <main className="flex min-h-[min(100dvh,100svh)] flex-1 flex-col items-center justify-center px-4 py-16 md:px-8 md:py-24">
      <div
        className="size-10 animate-spin rounded-full border-4 border-muted border-t-success"
        role="status"
        aria-label="Laster innlogging …"
      />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
