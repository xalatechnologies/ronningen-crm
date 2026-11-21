import { describe, expect, it, vi } from "vitest";

import {
  createTransaction,
  deleteTransaction,
  toTransactionPayload,
  updateTransaction,
} from "@/features/finance/data/transactions";
import type { TenantSupabaseClient } from "@/lib/queries/types";

describe("toTransactionPayload", () => {
  it("trims the category, turns an empty description into null and maps field names", () => {
    expect(
      toTransactionPayload({
        propertyId: "p1",
        type: "expense",
        category: "  renhold ",
        description: "   ",
        amount: 4999,
        transactionDate: "2026-05-01",
      }),
    ).toEqual({
      property_id: "p1",
      type: "expense",
      category: "renhold",
      description: null,
      amount: 4999,
      transaction_date: "2026-05-01",
    });
  });
});

function fakeClient() {
  const calls: Array<[string, unknown]> = [];
  const eq = vi.fn(async (col: string, val: unknown) => {
    calls.push([`eq:${col}`, val]);
    return { error: null };
  });
  const client = {
    from: (table: string) => ({
      update: (payload: unknown) => {
        calls.push([`update:${table}`, payload]);
        return { eq };
      },
      insert: async (payload: unknown) => {
        calls.push([`insert:${table}`, payload]);
        return { error: null };
      },
      delete: () => {
        calls.push([`delete:${table}`, null]);
        return { eq };
      },
    }),
  } as unknown as TenantSupabaseClient;
  return { client, calls };
}

const payload = {
  property_id: "p1",
  type: "income" as const,
  category: "leie",
  description: null,
  amount: 100,
  transaction_date: "2026-05-01",
};

describe("transaction data functions", () => {
  it("updates one row by id", async () => {
    const { client, calls } = fakeClient();
    await updateTransaction(client, "t1", payload);
    expect(calls).toEqual([["update:transactions", payload], ["eq:id", "t1"]]);
  });

  it("creates a row with the organization id attached", async () => {
    const { client, calls } = fakeClient();
    await createTransaction(client, "org1", payload);
    expect(calls).toEqual([["insert:transactions", { ...payload, organization_id: "org1" }]]);
  });

  it("deletes one row by id", async () => {
    const { client, calls } = fakeClient();
    await deleteTransaction(client, "t1");
    expect(calls).toEqual([["delete:transactions", null], ["eq:id", "t1"]]);
  });
});
