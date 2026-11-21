import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge must know our custom `text-app-*` font sizes (defined in globals.css).
 * Without this it treats `text-app-2xl` and a colour such as `text-foreground` as the same
 * group and silently drops the size when both are passed to `cn()`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "app-xs",
            "app-sm",
            "app-control",
            "app-base",
            "app-md",
            "app-lg",
            "app-xl",
            "app-2xl",
            "app-3xl",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
