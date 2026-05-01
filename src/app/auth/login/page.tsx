import { LoadingState } from "@/components/shared/loading-state";
import { Suspense } from "react";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <LoadingState label="Laster innlogging …" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
