import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/types/database.types";

export type LooseClient = SupabaseClient<Database>;

export function contractFrom(client: LooseClient, table: string) {
  return client.from(table as never);
}

export function asJson(value: unknown): Json {
  return value as Json;
}
