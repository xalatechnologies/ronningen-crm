"use client";

import { Download, Share, SquarePlus } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTranslation } from "@/i18n/client";
import { decideInstall, installMenuAvailable, isIosDevice, readInstallState, writeInstallState, type InstallStored } from "@/lib/pwa/install-state";
import { cn } from "@/lib/utils";

type DeferredPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

type InstallContext = { menuAvailable: boolean; isIos: boolean; install: () => Promise<void>; showIosHelp: () => void };
const Ctx = createContext<InstallContext>({ menuAvailable: false, isIos: false, install: async () => {}, showIosHelp: () => {} });
export const useInstall = () => useContext(Ctx);

const BANNER_DELAY_MS = 2500;

/**
 * Install prompt for the venue app and the customer portal (docs/pwa-install-plan.md). Mounted only in those
 * layouts, so guest pages, contracts, admin and login never see it.
 */
export function InstallProvider({ children, placement }: { children: ReactNode; /** "portal" lifts the banner above its bottom tab bar on phones. */ placement: "portal" | "app" }) {
  const { t } = useTranslation();
  const deferred = useRef<DeferredPrompt | null>(null);
  const [hasPrompt, setHasPrompt] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [stored, setStored] = useState<InstallStored>({});
  /** Set once, after a short delay, so the banner never flashes on load (and render stays free of Date.now()). */
  const [now, setNow] = useState(0);
  const [iosOpen, setIosOpen] = useState(false);

  const save = useCallback((patch: InstallStored | ((s: InstallStored) => InstallStored)) => {
    setStored((s) => {
      const next = typeof patch === "function" ? patch(s) : { ...s, ...patch };
      writeInstallState(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const readStandalone = () => display.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const initial = readInstallState();
    setStored(initial);
    setStandalone(readStandalone());
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
    setIsIos(isIosDevice(navigator));
    if (readStandalone()) save({ installed: true });

    const onDisplay = () => setStandalone(readStandalone());
    const onPrompt = (event: Event) => {
      event.preventDefault(); // we show our own prompt, from the user's tap
      deferred.current = event as DeferredPrompt;
      setHasPrompt(true);
    };
    const onInstalled = () => {
      deferred.current = null;
      setHasPrompt(false);
      save({ installed: true });
      toast.success(t("pwa.installedToast"));
    };
    display.addEventListener("change", onDisplay);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // Best effort (Chrome on Android): the browser knows if this web app is already on the phone.
    const related = (navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> }).getInstalledRelatedApps;
    void related?.call(navigator)?.then((apps) => (apps.length > 0 ? save({ installed: true }) : undefined)).catch(() => undefined);

    // Offline page worker (public/sw.js). NEXT_PUBLIC_DISABLE_SW=1 removes it again without a code change.
    if ("serviceWorker" in navigator) {
      if (process.env.NEXT_PUBLIC_DISABLE_SW === "1") {
        void navigator.serviceWorker.getRegistrations().then((all) => all.forEach((r) => void r.unregister()));
      } else {
        void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined);
      }
    }

    const timer = window.setTimeout(() => setNow(Date.now()), BANNER_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      display.removeEventListener("change", onDisplay);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registers listeners once; `t` only feeds a toast
  }, [save]);

  const dismiss = useCallback(() => save((s) => ({ ...s, dismissals: (s.dismissals ?? 0) + 1, dismissedAt: Date.now() })), [save]);

  const install = useCallback(async () => {
    const event = deferred.current;
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    deferred.current = null; // a prompt can be used once
    setHasPrompt(false);
    if (outcome === "dismissed") dismiss();
  }, [dismiss]);

  const decision = now > 0 ? decideInstall({ standalone, isIos, hasPrompt, coarsePointer: coarse, stored, now }) : "none";
  const value = useMemo<InstallContext>(
    () => ({ menuAvailable: installMenuAvailable({ standalone, isIos, hasPrompt, stored }), isIos, install, showIosHelp: () => setIosOpen(true) }),
    [standalone, isIos, hasPrompt, stored, install],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {decision !== "none" ? (
        <section
          role="dialog"
          aria-labelledby="pwa-title"
          className={cn(
            "fixed inset-x-3 z-40 mx-auto flex max-w-md flex-col gap-3 rounded-2xl bg-card p-4 shadow-lg ring-1 ring-foreground/10",
            placement === "portal" ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:bottom-4" : "bottom-4",
          )}
        >
          <div className="flex items-center gap-3">
            <span className="block size-11 shrink-0 overflow-hidden rounded-xl [--brand-tile:#0c1f16]">
              <BrandMark />
            </span>
            <div className="flex min-w-0 flex-col">
              <h2 id="pwa-title" className="font-heading text-base font-semibold">
                {t("pwa.title")}
              </h2>
              <p className="text-app-sm text-muted-foreground">{t("pwa.body")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="success" size="cta" className="flex-1" onClick={() => (decision === "install-button" ? void install() : setIosOpen(true))}>
              {decision === "install-button" ? t("pwa.install") : t("pwa.iosHow")}
            </Button>
            <Button type="button" variant="outline" size="cta" onClick={dismiss}>
              {t("pwa.later")}
            </Button>
          </div>
        </section>
      ) : null}

      <Sheet open={iosOpen} onOpenChange={setIosOpen}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("pwa.iosTitle")}</SheetTitle>
          </SheetHeader>
          <ol className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-4 text-app-base">
            {[
              { icon: Share, text: t("pwa.iosStep1") },
              { icon: SquarePlus, text: t("pwa.iosStep2") },
              { icon: Download, text: t("pwa.iosStep3") },
            ].map(({ icon: Icon, text }, index) => (
              <li key={index} className="flex items-center gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success/12 font-heading font-bold text-success">{index + 1}</span>
                <span className="flex-1">{text}</span>
                <Icon className="size-6 shrink-0 text-muted-foreground" aria-hidden />
              </li>
            ))}
          </ol>
          <div className="mx-auto flex w-full max-w-md gap-2 px-4 pb-4">
            <Button
              type="button"
              variant="success"
              size="cta"
              className="flex-1"
              onClick={() => {
                save({ installed: true });
                setIosOpen(false);
              }}
            >
              {t("pwa.iosDone")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="cta"
              onClick={() => {
                dismiss();
                setIosOpen(false);
              }}
            >
              {t("pwa.later")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </Ctx.Provider>
  );
}

/** Starts the install from a menu or header: the browser's prompt, or the iPhone instructions. */
export function useStartInstall() {
  const { install, isIos, showIosHelp } = useInstall();
  return useCallback(() => (isIos ? showIosHelp() : void install()), [install, isIos, showIosHelp]);
}

/** The venue user-menu entry; renders nothing when installing is not possible. */
export function InstallMenuItem() {
  const { t } = useTranslation();
  const { menuAvailable } = useInstall();
  const start = useStartInstall();
  if (!menuAvailable) return null;
  return (
    <DropdownMenuItem className="gap-3 rounded-lg px-3 py-2.5 font-heading text-app-md" onSelect={start}>
      <Download className="size-5 text-muted-foreground" aria-hidden />
      {t("pwa.menu")}
    </DropdownMenuItem>
  );
}

/** The customer-portal header button; renders nothing when installing is not possible. */
export function InstallHeaderButton() {
  const { t } = useTranslation();
  const { menuAvailable } = useInstall();
  const start = useStartInstall();
  if (!menuAvailable) return null;
  return (
    <Button type="button" variant="ghost" size="sm" className="size-11 shrink-0 rounded-full p-0" onClick={start} aria-label={t("pwa.menu")}>
      <Download className="size-5" aria-hidden />
    </Button>
  );
}
