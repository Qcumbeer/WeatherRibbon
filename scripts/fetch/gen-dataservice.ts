import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { US_CITIES } from '../../src/cities.ts'

// Rewrites src/dataService.ts so every city that currently has a real
// data/<slug>.json file is backed by a static import (Node- and Vite-
// compatible). Cities without a real file are intentionally left out of the
// static map; loadCity falls back to the synthetic climatology for them and
// the UI marks those as "mock".

const present = US_CITIES.filter((c) => existsSync(`data/${c.slug}.json`))

function ident(slug: string): string {
  const camel = slug
    .split('-')
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('')
  return `${camel}Data`
}

const path = 'src/dataService.ts'
const src = readFileSync(path, 'utf8')

const importLines = present.map(
  (c) => `import ${ident(c.slug)} from '../data/${c.slug}.json' with { type: 'json' }`,
).join('\n')

const staticEntries = present.map(
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
console.log(`Rewrote ${path}: ${present.length} of ${US_CITIES.length} cities have real static data; the rest use the synthetic fallback (mock).`)
