export function getMapboxAccessToken(): string | null {
  const value = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
  return value || null;
}

export function isMapboxConfigured(): boolean {
  return getMapboxAccessToken() != null;
}
