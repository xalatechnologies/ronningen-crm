const SIGNATURE_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg)$/;

export function isSignaturePath(path: string): boolean {
  return SIGNATURE_PATH.test(path);
}

export function signatureContentType(path: string): "image/png" | "image/jpeg" {
  return path.endsWith(".jpg") ? "image/jpeg" : "image/png";
}

export function signaturePathBelongsToOrg(path: string, organizationId: string): boolean {
  return isSignaturePath(path) && path.startsWith(`${organizationId}/`);
}

export async function canEmbedSignature(bytes: Uint8Array, kind: "png" | "jpg"): Promise<boolean> {
  try {
    const { PDFDocument } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    if (kind === "jpg") await pdf.embedJpg(bytes);
    else await pdf.embedPng(bytes);
    return true;
  } catch {
    return false;
  }
}
