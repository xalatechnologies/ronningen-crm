"use client";

import { useEffect } from "react";

const SHEET = "[data-slot=sheet-content]";

/**
 * App-like behaviour on phones, without touching individual screens:
 * - the on-screen keyboard sets --kb / --vvh and data-kb, so sheets sit above it and the nav and FABs get out of the way;
 * - a focused field scrolls into view instead of hiding behind the keyboard;
 * - the phone's Back button closes an open sheet instead of leaving the page.
 */
export function MobileFeel() {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;

    function syncViewport() {
      if (!vv) return;
      const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      root.style.setProperty("--kb", `${kb}px`);
      root.style.setProperty("--vvh", `${Math.round(vv.height)}px`);
      if (kb > 120) root.dataset.kb = "1";
      else delete root.dataset.kb;
    }
    syncViewport();
    vv?.addEventListener("resize", syncViewport);
    vv?.addEventListener("scroll", syncViewport);

    function onFocusIn(event: FocusEvent) {
      const el = event.target;
      if (!(el instanceof HTMLElement) || !el.matches("input, textarea, select")) return;
      window.setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 320);
    }
    document.addEventListener("focusin", onFocusIn);

    // Back button closes the topmost sheet. A history entry is pushed when a sheet opens and consumed when it closes.
    let pushed = false;
    function onPop() {
      if (!pushed) return;
      pushed = false;
      const sheet = document.querySelector<HTMLElement>(SHEET);
      if (!sheet) return;
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      sheet.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    }
    function onMutate() {
      const open = document.querySelector(SHEET) !== null;
      if (open && !pushed) {
        window.history.pushState({ ...(window.history.state ?? {}), sheet: true }, "", window.location.href);
        pushed = true;
      } else if (!open && pushed) {
        pushed = false;
        window.history.back();
      } else if (!open) {
      }
    }
    window.addEventListener("popstate", onPop);
    const observer = new MutationObserver(onMutate);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      vv?.removeEventListener("resize", syncViewport);
      vv?.removeEventListener("scroll", syncViewport);
      document.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("popstate", onPop);
      observer.disconnect();
      root.style.removeProperty("--kb");
      root.style.removeProperty("--vvh");
      delete root.dataset.kb;
    };
  }, []);

  return null;
}
