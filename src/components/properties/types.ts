export type PropertyListRow = {
  id: string;
  name: string;
  address: string | null;
  type: string | null;
  notes: string | null;
  updatedAtIso: string;
};

export function propertyTypeLabel(type: string | null): string {
  if (!type?.trim()) return "—";
  switch (type) {
    case "selskaplokale":
      return "Selskaplokale";
    case "gård":
      return "Gård";
    case "møterom":
      return "Møterom";
    case "festlokale":
      return "Festlokale";
    case "annet":
      return "Annet";
    default:
      return type;
  }
}
