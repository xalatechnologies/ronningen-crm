/**
 * Income-like values for `transactions.type` — keep in sync with Finans.
 */
export function isIncomeTransactionType(type: string): boolean {
  const x = type.trim().toLowerCase();
  return x === "income" || x === "inntekt" || x === "revenue";
}
