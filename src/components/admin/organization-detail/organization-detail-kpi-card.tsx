export function OrganizationDetailKpiCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="org-detail-kpi">
      <p className="dashboard-kpi-label">{label}</p>
      <p className="dashboard-kpi-value mt-2 text-foreground">{value}</p>
    </div>
  );
}
