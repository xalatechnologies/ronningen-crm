import { buttonVariants } from "@/components/ui/button";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <div className="mx-auto flex max-w-lg flex-col gap-3 text-center">
        <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
          {APP_NAME}
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          {APP_DESCRIPTION}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/auth/login" className={cn(buttonVariants())}>
          Sign in
        </Link>
        <Link
          href="/auth/register"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Create account
        </Link>
      </div>
    </main>
  );
}
