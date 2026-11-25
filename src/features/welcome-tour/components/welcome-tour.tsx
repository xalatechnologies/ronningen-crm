"use client";

import { Building, Building2, CalendarDays, CircleHelp, FileText, Receipt, ShieldCheck, Sparkles, Tags, UserPlus, Users, X, type LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { useTourAccount } from "@/features/welcome-tour/data/use-tour-account";
import { placeCard, sameBox, type Box, type CardPlacement } from "@/features/welcome-tour/lib/place-card";
import { TOUR_OPEN_EVENT } from "@/features/welcome-tour/lib/tour-events";
import { shouldAutoShowTour } from "@/features/welcome-tour/lib/tour-state";
import { getTourSteps, type TourIconName } from "@/features/welcome-tour/lib/tour-steps";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";

const ICONS: Record<TourIconName, LucideIcon> = {
  welcome: Sparkles,
  organization: Building,
  venue: Building2,
  bookings: CalendarDays,
  pricing: Tags,
  customers: Users,
  contracts: FileText,
  invoices: Receipt,
  team: UserPlus,
  account: ShieldCheck,
  help: CircleHelp,
};

const MEASURE_INTERVAL_MS = 250;
const RING_PADDING = 4;

type Layout = { box: Box | null; placement: CardPlacement | null };

const samePlacement = (a: CardPlacement | null, b: CardPlacement | null) =>
  a === b || Boolean(a && b && a.left === b.left && a.top === b.top && a.side === b.side && a.arrow.axis === b.arrow.axis && a.arrow.offset === b.arrow.offset);

function sameLayout(a: Layout, b: Layout) {
  return sameBox(a.box, b.box) && samePlacement(a.placement, b.placement);
}

/** The first selector that matches an element that is really on screen (not hidden, not zero-sized). */
function findVisibleTarget(selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      if (el.getClientRects().length === 0) continue;
      const style = window.getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      return el;
    }
  }
  return null;
}

/** Arrow on the card edge that faces the target. */
function arrowStyle(placement: CardPlacement) {
  const { side, arrow } = placement;
  if (side === "right") return { top: arrow.offset - 6, left: -6 };
  if (side === "below") return { left: arrow.offset - 6, top: -6 };
  return { left: arrow.offset - 6, bottom: -6 };
}

const ARROW_BORDER: Record<CardPlacement["side"], string> = {
  right: "border-b border-l",
  below: "border-t border-l",
  above: "border-r border-b",
};

/**
 * Welcome tour for new accounts. It draws a ring around the real part of the app a step is about and puts a small card
 * next to it; the page underneath stays usable. It opens by itself for a new account that has not seen it, and
 * from the help button in the header for anyone. Closing it is saved on the account, so it never returns.
 */
export function WelcomeTour({ impersonating }: { impersonating: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const titleId = useId();
  const { currentRole } = useCurrentOrganization();
  const { account, ready, markSeen } = useTourAccount();

  const steps = useMemo(() => getTourSteps(currentRole), [currentRole]);
  const [manualOpen, setManualOpen] = useState(false);
  const [closedNow, setClosedNow] = useState(false);
  const [index, setIndex] = useState(0);
  const [layout, setLayout] = useState<Layout>({ box: null, placement: null });
  const cardRef = useRef<HTMLDivElement>(null);

  const autoOpen = ready && !closedNow && shouldAutoShowTour({ account, impersonating });
  const open = (manualOpen || autoOpen) && steps.length > 0;
  const step = steps[Math.min(index, steps.length - 1)];

  // The help button opens the tour from step 1 at any time.
  useEffect(() => {
    const onOpen = () => {
      setIndex(0);
      setManualOpen(true);
    };
    window.addEventListener(TOUR_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(TOUR_OPEN_EVENT, onOpen);
  }, []);

  function close() {
    setManualOpen(false);
    setClosedNow(true);
    void markSeen();
  }

  // Esc closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setManualOpen(false);
        setClosedNow(true);
        void markSeen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, markSeen]);

  // Focus moves to the card at each step.
  const stepKey = step?.key;
  useEffect(() => {
    if (open) cardRef.current?.focus({ preventScroll: true });
  }, [open, stepKey]);

  // Find the target and place the card. Runs on a timer and on resize, which also covers a page that is still
  // loading after a step moved to another route. The target is scrolled into view once per step.
  useEffect(() => {
    if (!open || !step) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let scrolledTo: Element | null = null;

    const measure = () => {
      const el = findVisibleTarget(step.targets);
      let next: Layout = { box: null, placement: null };
      if (el) {
        if (scrolledTo !== el) {
          scrolledTo = el;
          el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
        }
        const rect = el.getBoundingClientRect();
        const box: Box = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        const card = cardRef.current;
        // Before the card has been laid out its size reads 0; use a sensible size until it is measured.
        const size = { width: card?.offsetWidth || 352, height: card?.offsetHeight || 220 };
        next = { box, placement: placeCard(box, size, window.innerWidth, window.innerHeight, step.placement ?? "auto") };
      }
      setLayout((prev) => (sameLayout(prev, next) ? prev : next));
    };

    const frame = window.requestAnimationFrame(measure);
    const timer = window.setInterval(measure, MEASURE_INTERVAL_MS);
    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
      window.removeEventListener("resize", measure);
    };
  }, [open, step]);

  if (!open || !step || typeof document === "undefined") return null;

  const Icon = ICONS[step.icon];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  function goTo(nextIndex: number) {
    const route = steps[nextIndex]?.route;
    setIndex(nextIndex);
    if (route && route !== pathname) router.push(route);
  }

  const { box, placement } = layout;
  const anchored = Boolean(box && placement);

  return createPortal(
    <>
      {box ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[60] rounded-xl ring-2 ring-success ring-offset-2 ring-offset-background motion-safe:transition-[left,top,width,height] motion-safe:duration-200"
          style={{ left: box.left - RING_PADDING, top: box.top - RING_PADDING, width: box.width + RING_PADDING * 2, height: box.height + RING_PADDING * 2 }}
        />
      ) : null}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "fixed z-[61] w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-foreground/10 bg-card p-5 text-card-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-success/40",
          !anchored && "inset-x-3 bottom-3 w-auto sm:inset-x-auto sm:end-4 sm:bottom-4 sm:w-[22rem]",
        )}
        style={anchored && placement ? { left: placement.left, top: placement.top } : undefined}
      >
        {anchored && placement ? (
          <span aria-hidden className={cn("absolute size-3 rotate-45 border-foreground/10 bg-card", ARROW_BORDER[placement.side])} style={arrowStyle(placement)} />
        ) : null}

        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/12 text-success" aria-hidden>
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1" aria-live="polite" aria-atomic="true">
            <h2 id={titleId} className="font-heading text-app-md font-bold break-words text-foreground">
              {t(`tips.${step.key}.t`)}
            </h2>
            <p className="mt-1.5 text-app-sm leading-relaxed break-words text-muted-foreground">{t(`tips.${step.key}.b`)}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="-me-1 -mt-1 size-8 shrink-0" onClick={close} aria-label={t("tips.close")}>
            <X className="size-4" aria-hidden />
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="min-w-0 space-y-1.5">
            <p className="text-app-xs font-semibold text-muted-foreground">{t("tips.stepOf", { current: index + 1, total: steps.length })}</p>
            <div className="flex gap-1.5" aria-hidden>
              {steps.map((s, i) => (
                <span key={s.key} className={cn("h-1.5 rounded-full", i === index ? "w-5 bg-success" : "w-1.5 bg-border")} />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isFirst ? (
              <Button type="button" variant="outline" size="sm" onClick={() => goTo(index - 1)}>
                {t("tips.previous")}
              </Button>
            ) : null}
            <Button type="button" variant="success" size="sm" onClick={isLast ? close : () => goTo(index + 1)}>
              {isLast ? t("tips.done") : t("tips.next")}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
