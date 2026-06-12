export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <noscript>
        <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-3 text-center text-sm">
          JavaScript må være aktivert for å logge inn.
        </div>
      </noscript>
      {children}
    </div>
  );
}
