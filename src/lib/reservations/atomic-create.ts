import type { SupabaseClient } from "@supabase/supabase-js";

import { hashOrgIdForLog } from "@/lib/reservations/create-logging";
import type { Database, Json } from "@/types/database.types";

export type AtomicCreateResult = {
  customerId: string;
  reservationId: string;
  reused: boolean;
  /** Present when create requested an inquiry link; false means convert did not land. */
  inquiryConverted?: boolean | null;
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
  const inquiryConvertedRaw = row?.inquiryConverted;
  const inquiryConverted =
    inquiryConvertedRaw === undefined
      ? undefined
      : inquiryConvertedRaw === null
        ? null
        : Boolean(inquiryConvertedRaw);
  return { customerId, reservationId, reused, inquiryConverted };
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

export async function replaceBookingCommercialChildren(
  supabase: SupabaseClient<Database>,
  args: {
    organizationId: string;
    bookingId: string;
    lineItems: unknown[];
    installments: unknown[];
  },
) {
  const { error } = await supabase.rpc("replace_booking_commercial_children" as never, {
    p_org: args.organizationId,
    p_booking: args.bookingId,
    p_line_items: args.lineItems as Json,
    p_installments: args.installments as Json,
  });
  if (!error) return;

  const lineRows = (includeDescription: boolean) =>
    args.lineItems.map((item, index) => {
      const row = item as Record<string, unknown>;
      return {
        organization_id: args.organizationId,
        booking_id: args.bookingId,
        kind: row.kind ?? "custom",
        catalog_id: row.catalog_id ?? null,
        name: row.name ?? "Linje",
        ...(includeDescription ? { description: row.description ?? null } : {}),
        quantity: row.quantity ?? 1,
        unit_amount_nok: row.unit_amount_nok ?? 0,
        sort_order: row.sort_order ?? index,
      };
    });

  const writeChildren = async (includeDescription: boolean) => {
    await supabase.from("booking_line_items" as never).delete().eq("booking_id", args.bookingId);
    const rows = lineRows(includeDescription);
    if (rows.length) {
      const inserted = await supabase.from("booking_line_items" as never).insert(rows as never);
      if (inserted.error) return inserted.error;
    }
    await supabase
      .from("booking_payment_installments" as never)
      .delete()
      .eq("booking_id", args.bookingId);
    if (args.installments.length) {
      await supabase.from("booking_payment_installments" as never).insert(
        args.installments.map((item, index) => {
          const row = item as Record<string, unknown>;
          return {
            organization_id: args.organizationId,
            booking_id: args.bookingId,
            label: row.label ?? "Forfall",
            amount_nok: row.amount_nok ?? 0,
            due_date: row.due_date ?? null,
            sort_order: row.sort_order ?? index,
          };
        }) as never,
      );
    }
    return null;
  };

  const withDescription = await writeChildren(true);
  if (withDescription) await writeChildren(false);
}

async function persistBookingCommercialChildren(
  supabase: SupabaseClient<Database>,
  payload: Record<string, unknown>,
  reservationId: string,
) {
  const lineItems = payload.line_items;
  if (!Array.isArray(lineItems) || lineItems.length === 0) return;
  await replaceBookingCommercialChildren(supabase, {
    organizationId: String(payload.organization_id ?? ""),
    bookingId: reservationId,
    lineItems,
    installments: Array.isArray(payload.installments) ? payload.installments : [],
  });
}

export async function createBookingAtomic(
  supabase: SupabaseClient<Database>,
  payload: Record<string, unknown>,
): Promise<AtomicCreateResult> {
  const result = await callAtomicRpc(supabase, "create_booking_atomic", payload, "booking");
  await persistBookingCommercialChildren(supabase, payload, result.reservationId);
  return result;
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
