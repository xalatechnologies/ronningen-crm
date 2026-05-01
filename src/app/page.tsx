import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { Building2, CalendarDays, PieChart } from "lucide-react";
import Link from "next/link";

const highlights = [
  {
    icon: Building2,
    title: "Lokaler og eiendom",
    text: "Oversikt over arealer, utstyr og vedlikehold.",
  },
  {
    icon: CalendarDays,
    title: "Bookinger",
    text: "Planlegg arrangementer og spor disponibilitet.",
  },
  {
    icon: PieChart,
    title: "Økonomi og rapporter",
    text: "Priser, fakturaer og tall samlet på ett sted.",
  },
] as const;

const primaryButtonClass = cn(
  buttonVariants({ variant: "success", size: "cta" }),
  "w-full sm:w-auto",
);

const secondaryButtonClass = cn(
  buttonVariants({ variant: "outline" }),
  "h-12 w-full rounded-md border-2 border-rn-border-strong bg-background px-6 font-heading text-base font-semibold shadow-sm hover:bg-muted sm:w-auto md:h-14",
);

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 md:px-8 md:py-24">
        <div className="flex w-full max-w-xl flex-col items-stretch gap-8">
          <Card
            className={cn(
              "w-full gap-0 py-0 text-base ring-0",
              RN_CARD_SHELL,
              "shadow-rn-card",
            )}
          >
            <CardHeader className="space-y-5 border-b-2 border-rn-border-strong/50 px-6 py-7 md:px-10 md:py-9">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div
                  className="flex size-14 shrink-0 items-center justify-center rounded-md border-2 border-rn-accent-border bg-success font-heading text-lg font-bold text-primary-light shadow-sm md:size-16 md:text-xl"
                  aria-hidden
                >
                  R
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <CardTitle className="font-heading text-2xl font-bold tracking-tight text-rn-text-heading md:text-3xl lg:text-4xl">
                    {APP_NAME}
                  </CardTitle>
                  <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    {APP_DESCRIPTION}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-8 px-6 pb-8 pt-7 md:px-10 md:pb-10 md:pt-8">
              <ul className="space-y-4" aria-label="Hovedfunksjoner">
                {highlights.map(({ icon: Icon, title, text }) => (
                  <li
                    key={title}
                    className="flex gap-4 rounded-md border border-rn-border-strong/60 bg-rn-surface-wash/80 px-4 py-3.5 md:px-5 md:py-4"
                  >
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-md border border-rn-border-strong/70 bg-card text-success"
                      aria-hidden
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-heading text-sm font-semibold text-rn-text-heading md:text-base">
                        {title}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {text}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
                <Link href="/auth/login" className={primaryButtonClass}>
                  Logg inn
                </Link>
                <Link href="/auth/register" className={secondaryButtonClass}>
                  Opprett konto
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
