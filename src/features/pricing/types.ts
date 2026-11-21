import type { Database } from "@/types/database.types";

export type PackageRow = Database["public"]["Tables"]["packages"]["Row"];
export type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
export type CatalogKind = "packages" | "services";
