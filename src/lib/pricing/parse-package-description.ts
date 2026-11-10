const PACKAGE_LIST_BULLET = /^[-•*–—]\s*/;

function splitCommaFeatures(line: string): string[] {
  const parts = line
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length >= 3 ? parts : [line];
}

/** First line without a list marker is the tagline; remaining lines are inclusion bullets. */
export function parsePackageDescription(description: string | null | undefined): {
  tagline: string | null;
  features: string[];
} {
  if (!description?.trim()) return { tagline: null, features: [] };
  const rawLines = description
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (rawLines.length === 1 && !PACKAGE_LIST_BULLET.test(rawLines[0]!)) {
    const features = splitCommaFeatures(rawLines[0]!);
    if (features.length > 1) return { tagline: null, features };
  }
  let start = 0;
  let tagline: string | null = null;
  if (rawLines.length > 0 && !PACKAGE_LIST_BULLET.test(rawLines[0]!)) {
    tagline = rawLines[0]!;
    start = 1;
  }
  const features = rawLines
    .slice(start)
    .flatMap((line) => {
      const stripped = line.replace(PACKAGE_LIST_BULLET, "").trim();
      if (!stripped) return [];
      if (PACKAGE_LIST_BULLET.test(line)) return [stripped];
      return splitCommaFeatures(stripped);
    })
    .filter(Boolean);
  return { tagline, features };
}
