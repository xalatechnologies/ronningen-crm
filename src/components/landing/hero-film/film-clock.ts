import type { getDictionary } from "@/i18n/dictionaries";

/** How long each scene of the hero film plays before the next one starts. */
export const FILM_SCENE_MS = 7000;

export type HeroFilmCopy = ReturnType<typeof getDictionary>["landing"]["heroFilm"];

/** The step after `current`, wrapping to the first one. */
export function nextFilmStep(current: number, count: number): number {
  return count <= 0 ? 0 : (current + 1) % count;
}
