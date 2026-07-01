import { Suspense } from "react";

import { LoginForm } from "./login-form";
import { LoginFormFallback } from "./login-form-fallback";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
