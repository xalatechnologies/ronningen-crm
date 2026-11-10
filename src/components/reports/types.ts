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

export type FestTypeBreakdown = {
  festType: string;
  count: number;
  pct: number;
};

export type ReportsRevenueKpis = {
  /** Fakturert omsetning (reservasjoner + overnatting) i valgt periode. */
  fakturertNok: number;
  revenueTrendPct: number | null;
  bookingFakturertNok: number;
  accommodationFakturertNok: number;
  totalPaid: number;
  totalUnpaid: number;
  paidShare: number;
  unpaidShareOfBooked: number;
};

export type ReportsBookingsKpis = {
  bookingCount: number;
  confirmedBookingCount: number;
  pendingBookingCount: number;
};

export type ReportsInquiryPipelineKpis = {
  openCount: number;
  estimatedNok: number;
  convertedCount: number;
  lostCount: number;
  conversionRatePct: number | null;
};

export type ReportsAccommodationKpis = {
  reservationCount: number;
  fakturertNok: number;
};

export type ReportsFinanceKpis = {
  incomeNok: number;
  expenseNok: number;
  netNok: number;
  incomeTrendPct: number | null;
  expenseTrendPct: number | null;
};

export type ReportsInvoiceKpis = {
  outstandingNok: number;
  overdueUnpaidCount: number;
};

export type ReportsPartnersKpis = {
  customerCount: number;
  newCustomersInPeriod: number;
  partnerCount: number;
  propertyCount: number;
};

export type ReportsPricingKpis = {
  packageCount: number;
  serviceCount: number;
};

/** Inventar: tilstand og forsikring — samme logikk som Inventar-siden. */
export type ReportsFacilityStats = {
  assetTotalValueNok: number;
  assetRowCount: number;
  assetTotalUnits: number;
  assetOperationalCount: number;
  assetMaintenanceCount: number;
  assetReplaceCount: number;
  assetInsuredLineCount: number;
  assetInsuredValueNok: number;
  assetUninsuredLineCount: number;
  assetUninsuredValueNok: number;
};

export type ReportsModuleKpis = {
  revenue: ReportsRevenueKpis;
  bookings: ReportsBookingsKpis;
  inquiries: ReportsInquiryPipelineKpis;
  accommodation: ReportsAccommodationKpis;
  finance: ReportsFinanceKpis;
  invoices: ReportsInvoiceKpis;
  partners: ReportsPartnersKpis;
  pricing: ReportsPricingKpis;
};

export type ReportsSectionProps = {
  kpis: ReportsModuleKpis;
  monthlyRevenue: MonthlyRevenuePoint[];
  eventBreakdown: EventTypeBreakdown[];
  festTypeBreakdown: FestTypeBreakdown[];
  facility: ReportsFacilityStats;
  reportYear: number;
  /** Today's calendar year — default selection and URL cleanup. */
  currentCalendarYear: number;
  /** Lower bound for year picker (data or platform floor). */
  calendarYearMin: number;
  /** Upper bound for year picker (planning horizon or latest booking). */
  calendarYearMax: number;
  /** Valgt måned (URL `month`) — nøkkeltall og diagram følger perioden. */
  focusMonth: number | null;
  allYears: boolean;
  /** Menneskelesbar periode (år eller «mai 2026»). */
  reportsPeriodLabel: string;
  loadError: string | null;
  hasRegisteredActivity: boolean;
};

export { REPORTS_CALENDAR_MIN_YEAR } from "@/lib/reports/calendar-range";
