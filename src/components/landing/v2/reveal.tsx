"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * Rises into place once as it enters the viewport. Content is visible on the
 * server and without script; the hidden start state is only applied after
 * mount, and only to elements that begin below the fold.
 */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className,
  children,
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.95) return;

    el.style.transitionDelay = `${delay}ms`;
    el.setAttribute("data-reveal", "hidden");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.setAttribute("data-reveal", "in");
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <Tag ref={ref} className={cn("lp-reveal", className)}>
      {children}
    </Tag>
  );
}
