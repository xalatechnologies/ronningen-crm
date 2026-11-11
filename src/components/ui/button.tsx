import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariantsBase = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[length:var(--app-radius)] border border-transparent bg-clip-padding text-app-control font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary !font-semibold !text-primary-foreground [a]:hover:bg-primary/80 [a]:!text-primary-foreground",
        outline:
          "border-foreground/30 bg-card text-foreground hover:border-foreground/50 hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "border-foreground/15 bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "bg-muted/70 text-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-muted/50 dark:hover:bg-muted/80",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "font-semibold text-primary underline underline-offset-4 hover:no-underline",
        /** Primærhandling (grønn) — brukes med `size="cta"` for felles størrelse i appen. */
        success:
          "border border-rn-accent-border bg-success !font-semibold !text-white shadow-sm hover:bg-rn-accent-fill-hover hover:!text-white visited:!text-white [a]:!text-white [a]:visited:!text-white [a]:hover:bg-rn-accent-fill-hover [a]:hover:!text-white focus-visible:border-success focus-visible:ring-success/35 [&_svg]:!text-white",
      },
      size: {
        default:
          "min-h-[max(var(--app-button-min-height),var(--app-tap-target-min))] gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 min-h-0 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-app-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 min-h-0 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-app-sm in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-[max(var(--app-button-min-height),var(--app-tap-target-min))] gap-1.5 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        /** Hoved-CTA: 44px, kompakt og lesbar. */
        cta: "min-h-11 gap-2 rounded-xl px-5 text-app-sm font-semibold has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5 [&_svg:not([class*='size-'])]:size-4",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-md",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/** Merged with twMerge so variant borders override the base transparent border (also for `<a>` links). */
const buttonVariants = (props?: Parameters<typeof buttonVariantsBase>[0]) =>
  cn(buttonVariantsBase(props));

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariantsBase>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
