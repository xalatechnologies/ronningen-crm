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

export type ReportsKpis = {
  /** Fakturert omsetning (reservasjoner + overnatting) i valgt periode. */
  revenueYtd: number;
  revenueTrendPct: number | null;
  totalBooked: number;
  totalPaid: number;
  totalUnpaid: number;
  bookingCount: number;
  confirmedBookingCount: number;
  pendingBookingCount: number;
  inquiryCount: number;
  inquiryEstimatedTotal: number;
  accommodationCount: number;
  accommodationBookedNok: number;
  paidShare: number;
  unpaidShareOfBooked: number;
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

export type ReportsSectionProps = {
  kpis: ReportsKpis;
  monthlyRevenue: MonthlyRevenuePoint[];
  eventBreakdown: EventTypeBreakdown[];
  festTypeBreakdown: FestTypeBreakdown[];
  /** Inventar (tilstand / forsikring) — samme logikk som Inventar-siden. */
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
