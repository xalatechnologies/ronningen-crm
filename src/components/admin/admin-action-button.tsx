import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

type AdminActionButtonProps = ComponentProps<typeof Button>;

/** Standard admin action — outline, default platform control height. */
export function AdminActionButton({
  className,
  variant = "outline",
  size = "default",
  ...props
}: AdminActionButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn("admin-action-btn shrink-0", className)}
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
    <AdminActionButton
      className={className}
      nativeButton={false}
      render={<Link href={href} />}
    >
      {children}
    </AdminActionButton>
  );
}
