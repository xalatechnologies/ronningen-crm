import { ProtectedLayout } from "@/components/layout/protected-layout";

export default function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
