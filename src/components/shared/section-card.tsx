import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";

export function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="px-[length:var(--app-card-padding)] pb-0 pt-[length:var(--app-card-padding)]">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-[length:var(--app-card-padding)] pb-[length:var(--app-card-padding)] pt-3">
        {children}
      </CardContent>
    </Card>
  );
}
