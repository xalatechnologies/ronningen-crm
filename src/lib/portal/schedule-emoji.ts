/** Emojis a customer can pick for a plan item. Stored as a leading character in the title, so no schema change. */
export const SCHEDULE_EMOJIS = [
  "🥂", "🍽️", "🎂", "💃", "🎤", "🎵", "📸", "💍", "💐", "🕊️", "🎉", "☕", "🍰", "🎁", "🚗", "🌸", "✨", "🧁", "🎶", "🏁",
] as const;

/** Splits a leading picker emoji off a title: "🥂 Skål" -> { emoji: "🥂", text: "Skål" }. */
export function splitEmoji(title: string): { emoji: string; text: string } {
  const emoji = SCHEDULE_EMOJIS.find((e) => title.startsWith(e));
  return emoji ? { emoji, text: title.slice(emoji.length).trimStart() } : { emoji: "", text: title };
}

export function withEmoji(emoji: string, text: string): string {
  return emoji ? `${emoji} ${text}` : text;
}
