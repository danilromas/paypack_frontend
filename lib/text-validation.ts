/** Cyrillic + Cyrillic Supplement blocks. The product targets EU marketplaces, so user-facing text is Latin-only. */
const CYRILLIC_RE = /[Ѐ-ԯ]/

export const LATIN_ONLY_MESSAGE = "Please use Latin characters only (no Cyrillic)"

export function containsCyrillic(value: string | null | undefined): boolean {
  return !!value && CYRILLIC_RE.test(value)
}
