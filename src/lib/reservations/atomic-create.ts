import type { SupabaseClient } from "@supabase/supabase-js";

import { hashOrgIdForLog } from "@/lib/reservations/create-logging";
import type { Database, Json } from "@/types/database.types";

export type AtomicCreateResult = {
  customerId: string;
  reservationId: string;
  reused: boolean;
};

export type AtomicCustomerCreateResult = {
  customerId: string;
  reused: boolean;
};

type RpcName =
  | "create_booking_atomic"
  | "create_inquiry_atomic"
  | "create_accommodation_reservation_atomic"
  | "create_customer_atomic";

function parseAtomicResult(
  data: unknown,
  entityType: string,
): AtomicCreateResult {
  const row = data as Record<string, unknown> | null;
  const customerId = String(row?.customerId ?? "");
  const reservationId = String(
    row?.reservationId ?? row?.bookingId ?? row?.inquiryId ?? "",
  );
  const reused = Boolean(row?.reused);
  if (!customerId || !reservationId) {
    throw new Error(`${entityType}_atomic_invalid_response`);
  }
  return { customerId, reservationId, reused };
}

async function callAtomicRpc(
  supabase: SupabaseClient<Database>,
  rpcName: RpcName,
  payload: Record<string, unknown>,
  entityType: string,
): Promise<AtomicCreateResult> {
  const started = Date.now();
  const clientRequestId = String(payload.client_request_id ?? "");
  const orgId = String(payload.organization_id ?? "");

  const { data, error } = await supabase.rpc(rpcName, {
    payload: payload as Json,
  });

  const durationMs = Date.now() - started;

  if (error) {
    console.info(
      JSON.stringify({
        event: "reservation.create",
        entityType,
        orgIdHash: hashOrgIdForLog(orgId),
        clientRequestId,
        reused: false,
        durationMs,
        ok: false,
        errorCode: error.code ?? "rpc_error",
      }),
    );
    throw error;
  }

  const result = parseAtomicResult(data, entityType);
  console.info(
    JSON.stringify({
      event: "reservation.create",
      entityType,
      orgIdHash: hashOrgIdForLog(orgId),
      clientRequestId,
      reused: result.reused,
      durationMs,
      ok: true,
    }),
  );
  return result;
}

export async function createBookingAtomic(
  supabase: SupabaseClient<Database>,
  payload: Record<string, unknown>,
): Promise<AtomicCreateResult> {
  return callAtomicRpc(supabase, "create_booking_atomic", payload, "booking");
}

export async function createInquiryAtomic(
  supabase: SupabaseClient<Database>,
  payload: Record<string, unknown>,
): Promise<AtomicCreateResult> {
  return callAtomicRpc(supabase, "create_inquiry_atomic", payload, "inquiry");
}

export async function createAccommodationReservationAtomic(
  supabase: SupabaseClient<Database>,
  payload: Record<string, unknown>,
): Promise<AtomicCreateResult> {
  return callAtomicRpc(
    supabase,
    "create_accommodation_reservation_atomic",
    payload,
    "accommodation",
  );
}

export async function createCustomerAtomic(
  supabase: SupabaseClient<Database>,
  payload: Record<string, unknown>,
): Promise<AtomicCustomerCreateResult> {
  const started = Date.now();
  const orgId = String(payload.organization_id ?? "");
  const { data, error } = await supabase.rpc("create_customer_atomic", {
    payload: payload as Json,
  });
  const durationMs = Date.now() - started;
  if (error) {
    console.info(
      JSON.stringify({
        event: "reservation.create",
        entityType: "customer",
        orgIdHash: hashOrgIdForLog(orgId),
        clientRequestId: null,
        reused: false,
        durationMs,
        ok: false,
        errorCode: error.code ?? "rpc_error",
      }),
    );
    throw error;
  }
  const row = data as Record<string, unknown> | null;
  const customerId = String(row?.customerId ?? "");
  if (!customerId) throw new Error("customer_atomic_invalid_response");
  const reused = Boolean(row?.reused);
  console.info(
    JSON.stringify({
      event: "reservation.create",
      entityType: "customer",
      orgIdHash: hashOrgIdForLog(orgId),
      clientRequestId: null,
      reused,
      durationMs,
      ok: true,
    }),
  );
  return { customerId, reused };
}
