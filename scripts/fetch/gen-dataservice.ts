import { readFileSync, writeFileSync } from 'node:fs'
import { US_CITIES } from '../../src/cities.ts'

// Rewrites src/dataService.ts so every city in the canonical index is backed
// by its own static data/<slug>.json import (Node- and Vite-compatible),
// instead of only a handful of hand-listed cities.

function ident(slug: string): string {
  const camel = slug
    .split('-')
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('')
  return `${camel}Data`
}

const path = 'src/dataService.ts'
const src = readFileSync(path, 'utf8')

const importLines = US_CITIES.map(
  (c) => `import ${ident(c.slug)} from '../data/${c.slug}.json' with { type: 'json' }`,
).join('\n')

const staticEntries = US_CITIES.map(
  (c) => `  '${c.slug}': () => Promise.resolve({ default: ${ident(c.slug)} }),`,
).join('\n')

// 1) Replace the contiguous block of `import X from '../data/*.json'` lines.
const jsonImportRe = /^import \w+ from '\.\.\/data\/[^']+\.json' with \{ type: 'json' \}\n/gm
if (!jsonImportRe.test(src)) throw new Error('No static JSON import block found')
const withoutImports = src.replace(jsonImportRe, '')
const anchor = `import { fallbackClimate } from './fallbackClimate.ts'\n`
if (!withoutImports.includes(anchor)) throw new Error('fallbackClimate import anchor not found')
const withImports = withoutImports.replace(anchor, `${anchor}${importLines}\n`)

// 2) Replace the STATIC map body.
const staticRe = /const STATIC: Record<string, \(\) => Promise<\{ default: unknown \}>> = \{[\s\S]*?\n\}/
if (!staticRe.test(withImports)) throw new Error('STATIC map not found')
const out = withImports.replace(
  staticRe,
  `const STATIC: Record<string, () => Promise<{ default: unknown }>> = {\n${staticEntries}\n}`,
)

writeFileSync(path, out)
console.log(`Rewrote ${path}: ${US_CITIES.length} static city imports.`)
