"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { needsPopup } from "@/lib/notifications/user-notification-filters";
import { useNotifications } from "@/providers/notification-provider";
import Link from "next/link";
import { useMemo, useState } from "react";

export function NotificationAckDialog() {
  const { scopedNotifications, acknowledge } = useNotifications();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const queue = useMemo(
    () =>
      scopedNotifications.filter(
        (n) =>
          n.priority === "high" &&
          needsPopup(n) &&
          !dismissedIds.has(n.id),
      ),
    [scopedNotifications, dismissedIds],
  );

  const current = queue[0] ?? null;
  const open = Boolean(current);

  async function handleAcknowledge() {
    if (!current) return;
    await acknowledge(current.id);
    setDismissedIds((prev) => new Set(prev).add(current.id));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && current) {
          void handleAcknowledge();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{current?.title ?? "Varsel"}</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap pt-2 text-foreground">
            {current?.body}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          {current?.action_url ? (
            <Button variant="outline" render={<Link href={current.action_url} />}>
              {current.action_label ?? "Åpne"}
            </Button>
          ) : null}
          <Button onClick={() => void handleAcknowledge()}>Jeg forstår</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
