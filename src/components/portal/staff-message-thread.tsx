"use client";

import { MessageThread } from "@/components/portal/message-thread";
import { markThreadReadByStaff, sendStaffMessage } from "@/lib/portal/messages-actions";
import type { PortalMessage } from "@/lib/portal/messages-rules";

export function StaffMessageThread({ bookingId, messages }: { bookingId: string; messages: PortalMessage[] }) {
  return (
    <MessageThread
      viewer="staff"
      messages={messages}
      send={(body) => sendStaffMessage({ bookingId, body })}
      markRead={() => markThreadReadByStaff(bookingId)}
      stickyOffsetClassName="bottom-0 pb-3 sm:bottom-4"
      roomy
    />
  );
}
