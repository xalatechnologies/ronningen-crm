export type MonthlyRevenuePoint = {
  monthIndex: number;
  label: string;
  amount: number;
};

export type EventTypeBreakdown = {
  eventType: string;
  count: number;
  pct: number;
};

export type UpcomingBookingRow = {
  id: string;
  customerName: string;
  initials: string;
  eventDate: string;
  status: "confirmed" | "pending" | "cancelled";
};

export type ReportsKpis = {
  revenueYtd: number;
  revenueTrendPct: number | null;
  totalBooked: number;
  totalPaid: number;
  totalUnpaid: number;
  bookingCount: number;
  confirmedBookingCount: number;
  pendingBookingCount: number;
  paidShare: number;
  unpaidShareOfBooked: number;
};

export type ReportsSectionProps = {
  kpis: ReportsKpis;
  monthlyRevenue: MonthlyRevenuePoint[];
  eventBreakdown: EventTypeBreakdown[];
  upcoming: UpcomingBookingRow[];
  reportYear: number;
  loadError: string | null;
};
