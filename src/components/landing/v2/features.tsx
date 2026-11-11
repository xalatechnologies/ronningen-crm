"use client";

import { copyFor } from "@/components/landing/v2/content";
import { Reveal } from "@/components/landing/v2/reveal";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { useMemo, useState, type KeyboardEvent } from "react";

export function Features() {
  const { locale } = useTranslation();
  const f = copyFor(locale).features;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(1);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return f.items;
    return f.items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) || i.text.toLowerCase().includes(q),
    );
  }, [f.items, query]);

  const active = Math.min(selected, Math.max(rows.length - 1, 0));

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((active + 1) % Math.max(rows.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((active - 1 + rows.length) % Math.max(rows.length, 1));
    }
  }

  return (
    <section
      id="funksjoner"
      aria-labelledby="lp-features"
      className="lp-x py-[clamp(72px,10vw,160px)]"
    >
      <Reveal as="h2">
        <span
          id="lp-features"
          className="block max-w-[22ch] text-[clamp(30px,3.4vw,52px)] leading-[1.08] font-bold tracking-[-0.025em] text-[#0c1f16]"
        >
          {f.title}
        </span>
      </Reveal>

      <Reveal delay={80} className="mt-10">
        <label htmlFor="lp-find" className="sr-only">
          {f.placeholder}
        </label>
        <input
          id="lp-find"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={f.placeholder}
          autoComplete="off"
          className="h-[1.9em] w-full rounded-[8px] bg-[#e8edeb] px-[0.6em] text-[clamp(22px,3vw,44px)] font-medium text-[#0c1f16] placeholder:text-[#334155] focus-visible:outline-3 focus-visible:outline-[#85b098] lg:w-[84%]"
        />
      </Reveal>

      <ul className="mt-6 flex flex-col" data-ui>
        {rows.length === 0 ? (
          <li className="px-4 py-8 text-[24px] text-[#334155]">{f.empty}</li>
        ) : (
          rows.map((item, i) => {
            const on = i === active;
            return (
              <li key={item.name}>
                <button
                  type="button"
                  onMouseEnter={() => setSelected(i)}
                  onFocus={() => setSelected(i)}
                  onClick={() => setSelected(i)}
                  aria-pressed={on}
                  className={cn(
                    "flex w-full flex-col rounded-[8px] px-4 py-2 text-left transition-colors duration-200 sm:px-6",
                    on ? "bg-[#1a4331] text-white" : "text-[#0c1f16]",
                  )}
                >
                  <span className="flex w-full items-center justify-between gap-4">
                    <span className="text-[clamp(30px,8.5vw,40px)] leading-[1.1] font-bold tracking-[-0.025em] sm:text-[clamp(36px,4.6vw,76px)]">
                      {item.name}
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "hidden size-[clamp(34px,3.4vw,52px)] shrink-0 items-center justify-center rounded-[6px] text-[clamp(16px,1.6vw,24px)] font-bold sm:flex",
                        on ? "bg-white text-[#1a4331]" : "bg-[#e8edeb] text-[#334155]",
                      )}
                    >
                      {item.key}
                    </span>
                  </span>
                  {on ? (
                    <span className="lp-swap mt-1 max-w-[52ch] pb-2 text-[17px] leading-[1.5] text-white">
                      {item.text}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
