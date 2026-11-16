/** Shown at once while a portal page loads its data, so tab taps feel instant. */
export default function PortalLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" role="status" aria-busy="true">
      <div className="flex flex-col gap-3">
        <div className="h-8 w-40 rounded-full bg-primary-soft" />
        <div className="h-4 w-full max-w-sm rounded-full bg-primary-soft/70" />
      </div>
      <div className="h-36 rounded-3xl bg-primary-soft ring-1 ring-gold/30" />
      <div className="flex flex-col gap-3">
        <div className="h-20 rounded-3xl bg-card ring-1 ring-gold/30" />
        <div className="h-20 rounded-3xl bg-card ring-1 ring-gold/30" />
        <div className="h-20 rounded-3xl bg-card ring-1 ring-gold/30" />
      </div>
    </div>
  );
}
