import type { Database } from "@/types/database.types";

export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

export type PartnerRow = Database["public"]["Tables"]["partners"]["Row"];

export type CustomerBookingListItem = {
  id: string;
  customer_id: string;
  event_type: string;
  event_date: string;
  guest_count: number;
  total_price: number;
  remaining_amount: number;
  status: string;
  propertyName: string | null;
};
