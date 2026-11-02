const SIGNATURE_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg)$/;

export function isSignaturePath(path: string): boolean {
  return SIGNATURE_PATH.test(path);
}

export function signatureContentType(path: string): "image/png" | "image/jpeg" {
  return path.endsWith(".jpg") ? "image/jpeg" : "image/png";
}
