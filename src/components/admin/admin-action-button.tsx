import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

type AdminActionButtonProps = ComponentProps<typeof Button>;

function resolveAdminActionVariant(
  type: AdminActionButtonProps["type"],
  variant: AdminActionButtonProps["variant"],
): NonNullable<AdminActionButtonProps["variant"]> {
  if (variant != null) return variant;
  if (type === "submit") return "success";
  return "outline";
}

/** Standard admin action — primary submits use success; secondary actions stay outline. */
export function AdminActionButton({
  className,
  variant,
  size = "default",
  type,
  ...props
}: AdminActionButtonProps) {
  const resolvedVariant = resolveAdminActionVariant(type, variant);

  return (
    <Button
      variant={resolvedVariant}
      size={size}
      type={type}
      className={cn(
        "admin-action-btn shrink-0",
        resolvedVariant === "outline" && "admin-action-btn--secondary",
        className,
      )}
      {...props}
    />
  );
}

export function AdminLinkButton({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "outline", size: "default" }),
        "admin-action-btn admin-action-btn--secondary shrink-0",
        className,
      )}
    >
      {children}
    </Link>
  );
}
