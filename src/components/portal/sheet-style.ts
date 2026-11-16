/**
 * Portal sheets render in a portal outside the page tree, so they carry the wedding theme themselves
 * (`wedding-portal`) plus the rounded, gold-trimmed look.
 */
export const PORTAL_SHEET =
  "wedding-portal !bg-card rounded-t-[2rem] border-t border-gold/60 pt-5 shadow-[0_-16px_48px_-12px_rgba(138,44,82,0.4)] " +
  "before:mx-auto before:-mt-1 before:mb-1 before:h-1 before:w-10 before:rounded-full before:bg-gold/60 before:content-[''] " +
  "[&_[data-slot=sheet-title]]:font-serif [&_[data-slot=sheet-title]]:text-2xl [&_[data-slot=sheet-title]]:font-semibold " +
  "[&_input]:rounded-2xl [&_input]:border-gold/40 [&_textarea]:rounded-2xl [&_textarea]:border-gold/40 " +
  "[&_[data-slot=button]]:rounded-full [&_[data-slot=sheet-close]]:rounded-full [&_[data-slot=sheet-close]]:ring-1 [&_[data-slot=sheet-close]]:ring-gold/50";
