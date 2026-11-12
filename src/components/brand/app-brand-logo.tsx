import { BrandMark } from "@/components/brand/brand-logo";

type AppBrandLogoProps = {
  className?: string;
  /** Kept for existing call sites; the mark is a vector and needs no sizing hints. */
  sizes?: string;
  priority?: boolean;
};

export function AppBrandLogo({ className }: AppBrandLogoProps) {
  return <BrandMark className={className} />;
}
