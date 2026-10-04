import { frozenPackageDescription } from "@/lib/contracts/paper-copy";

export type BookingPackageOption = {
  id: string;
  name: string;
  description: string | null;
  price: number;
};

export type BookingAddonOption = {
  id: string;
  name: string;
  description: string | null;
  price: number;
};

export type StoredBookingLine = {
  kind: string;
  name: string;
  quantity: number;
  unitAmountNok: number;
  catalogId: string | null;
};

export type BookingPackageAddonFormValues = {
  packageSource: "catalog" | "custom";
  selectedPackageId: string;
  customPackageName: string;
  customPackagePrice: number;
  selectedAddonIds: string[];
  customAddonLines: { name: string; priceNok: number }[];
};

export type BookingCommercialLinePayload = {
  kind: string;
  catalog_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit_amount_nok: number;
  sort_order: number;
};

export const emptyPackageAddonFormValues: BookingPackageAddonFormValues = {
  packageSource: "catalog",
  selectedPackageId: "",
  customPackageName: "",
  customPackagePrice: 0,
  selectedAddonIds: [],
  customAddonLines: [],
};

export function parseInquiryCommercial(
  raw: unknown,
): BookingPackageAddonFormValues {
  if (!raw || typeof raw !== "object") return { ...emptyPackageAddonFormValues };
  const value = raw as Record<string, unknown>;
  const customAddonLines = Array.isArray(value.customAddonLines)
    ? value.customAddonLines
        .map((line) => {
          const row = line as { name?: unknown; priceNok?: unknown };
          return {
            name: String(row.name ?? "").trim(),
            priceNok: Number(row.priceNok) || 0,
          };
        })
        .filter((line) => line.name.length > 0)
    : [];
  const selectedAddonIds = Array.isArray(value.selectedAddonIds)
    ? value.selectedAddonIds
        .map((id) => String(id))
        .filter((id) => id.length > 0)
    : [];
  const packageSource = value.packageSource === "custom" ? "custom" : "catalog";
  return {
    packageSource,
    selectedPackageId:
      packageSource === "catalog" ? String(value.selectedPackageId ?? "") : "",
    customPackageName: String(value.customPackageName ?? ""),
    customPackagePrice: Number(value.customPackagePrice) || 0,
    selectedAddonIds,
    customAddonLines,
  };
}

export function inquiryHasCommercialSelection(
  form: BookingPackageAddonFormValues,
): boolean {
  if (form.packageSource === "custom" && form.customPackageName.trim()) return true;
  if (form.packageSource === "catalog" && form.selectedPackageId) return true;
  if (form.selectedAddonIds.length > 0) return true;
  if (form.customAddonLines.some((line) => line.name.trim())) return true;
  return false;
}

export function packageAddonFormFromLines(
  lines: StoredBookingLine[],
  packages: BookingPackageOption[],
  addons: BookingAddonOption[],
): BookingPackageAddonFormValues {
  const packageLine = lines.find((line) => line.kind === "package");
  const catalogAddonIds = new Set(addons.map((addon) => addon.id));
  const selectedAddonIds: string[] = [];
  const customAddonLines: { name: string; priceNok: number }[] = [];

  for (const line of lines) {
    if (line.kind === "package" || line.kind === "adjustment") continue;
    if (line.kind === "addon" && line.catalogId && catalogAddonIds.has(line.catalogId)) {
      selectedAddonIds.push(line.catalogId);
      continue;
    }
    customAddonLines.push({
      name: line.name,
      priceNok: line.unitAmountNok * (line.quantity || 1),
    });
  }

  if (
    packageLine?.catalogId &&
    packages.some((pkg) => pkg.id === packageLine.catalogId)
  ) {
    return {
      packageSource: "catalog",
      selectedPackageId: packageLine.catalogId,
      customPackageName: "",
      customPackagePrice: 0,
      selectedAddonIds,
      customAddonLines,
    };
  }

  if (packageLine) {
    return {
      packageSource: "custom",
      selectedPackageId: "",
      customPackageName: packageLine.name,
      customPackagePrice: packageLine.unitAmountNok,
      selectedAddonIds,
      customAddonLines,
    };
  }

  if (packages.length > 0) {
    return {
      packageSource: "catalog",
      selectedPackageId: packages[0]!.id,
      customPackageName: "",
      customPackagePrice: 0,
      selectedAddonIds,
      customAddonLines,
    };
  }

  return {
    packageSource: "custom",
    selectedPackageId: "",
    customPackageName: "",
    customPackagePrice: 0,
    selectedAddonIds,
    customAddonLines,
  };
}

export function buildBookingLineItems(args: {
  form: BookingPackageAddonFormValues;
  packages: BookingPackageOption[];
  addons: BookingAddonOption[];
  agreedTotal: number;
  defaultPackageName: string;
}): BookingCommercialLinePayload[] {
  const lineItems: BookingCommercialLinePayload[] = [];
  const catalogPackage = args.packages.find(
    (pkg) => pkg.id === args.form.selectedPackageId,
  );

  if (args.form.packageSource === "custom") {
    lineItems.push({
      kind: "package",
      catalog_id: null,
      name: args.form.customPackageName.trim() || args.defaultPackageName,
      description: null,
      quantity: 1,
      unit_amount_nok: args.form.customPackagePrice,
      sort_order: 0,
    });
  } else if (catalogPackage) {
    lineItems.push({
      kind: "package",
      catalog_id: catalogPackage.id,
      name: catalogPackage.name,
      description: frozenPackageDescription(
        catalogPackage.name,
        catalogPackage.description,
      ),
      quantity: 1,
      unit_amount_nok: catalogPackage.price,
      sort_order: 0,
    });
  }

  args.form.selectedAddonIds.forEach((id) => {
    const addon = args.addons.find((item) => item.id === id);
    if (!addon) return;
    lineItems.push({
      kind: "addon",
      catalog_id: addon.id,
      name: addon.name,
      description: addon.description,
      quantity: 1,
      unit_amount_nok: addon.price,
      sort_order: lineItems.length,
    });
  });

  args.form.customAddonLines.forEach((line) => {
    if (!line.name.trim()) return;
    lineItems.push({
      kind: "custom",
      catalog_id: null,
      name: line.name.trim(),
      description: null,
      quantity: 1,
      unit_amount_nok: line.priceNok,
      sort_order: lineItems.length,
    });
  });

  const lineSum = lineItems.reduce(
    (sum, line) => sum + line.quantity * line.unit_amount_nok,
    0,
  );
  if (Math.abs(lineSum - args.agreedTotal) >= 0.01) {
    lineItems.push({
      kind: "adjustment",
      catalog_id: null,
      name: "Avtalt justering",
      description: null,
      quantity: 1,
      unit_amount_nok: args.agreedTotal - lineSum,
      sort_order: lineItems.length,
    });
  }

  return lineItems;
}
