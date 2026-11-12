import type { Metadata } from "next";

// Guest links carry a secret: never index them and never leak them through the Referer header.
export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
