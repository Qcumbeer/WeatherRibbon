export const RIBBON_SLUGS = new Set(['new-york'])

export function ribbonSrc(slug?: string): string | undefined {
  if (!slug || !RIBBON_SLUGS.has(slug)) return undefined
  return `/ribbons/${slug}.svg`
}
