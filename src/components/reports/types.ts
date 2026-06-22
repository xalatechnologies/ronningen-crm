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
  /** Gjeldende kalenderår (øvre grense for årvelger). */
  calendarYearMax: number;
  /** Valgt måned (URL `month`) — nøkkeltall og diagram følger perioden. */
  focusMonth: number | null;
  /** Menneskelesbar periode (år eller «mai 2026»). */
  reportsPeriodLabel: string;
  loadError: string | null;
  hasRegisteredActivity: boolean;
};

/** Laveste år i rapporter-kalenderen. */
export const REPORTS_CALENDAR_MIN_YEAR = 2020;
