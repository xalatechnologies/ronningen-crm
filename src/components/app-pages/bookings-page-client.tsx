"use client";

import { AppPageSkeleton } from "@/components/shared/app-page-skeleton";
import { useBookingsQuery } from "@/hooks/use-tenant-page-queries";
import dynamic from "next/dynamic";

const BookingsList = dynamic(
  () =>
    import("@/components/bookings/bookings-list").then((m) => ({
      default: m.BookingsList,
    })),
  { loading: () => <AppPageSkeleton variant="table" /> },
);

export function BookingsPageClient() {
  const { data, isPending } = useBookingsQuery();
  if (isPending && !data) return <AppPageSkeleton variant="table" />;
  if (!data) return null;
  return (
    <BookingsList
      bookings={data.bookings}
      loadError={data.loadError}
      canDeleteBookings={data.canDeleteBookings}
    />
  );
}
