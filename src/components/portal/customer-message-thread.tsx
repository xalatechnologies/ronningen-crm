"use client";

import { MessageThread } from "@/components/portal/message-thread";
import { markThreadReadByCustomer, sendCustomerMessage } from "@/lib/portal/messages-actions";
import type { PortalMessage } from "@/lib/portal/messages-rules";

export function CustomerMessageThread({ messages }: { messages: PortalMessage[] }) {
  return (
    <MessageThread
      viewer="customer"
      messages={messages}
      send={(body) => sendCustomerMessage({ body })}
      markRead={markThreadReadByCustomer}
      roomy
    />
  );
}
