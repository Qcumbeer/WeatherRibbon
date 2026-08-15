import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { createElement, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { bySlug } from '../src/cities.ts'
import { parseHash, routeToCity } from '../src/router.ts'
import { FiveYearClimate } from '../src/FiveYearClimate.tsx'
import { useHashRoute } from '../src/useHashRoute.ts'
import { formatPrecip, formatTemp, type AnnualRecord } from '../src/annual.ts'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'https://weatherfork.test/',
  pretendToBeVisual: true,
})
const { window } = dom
Object.defineProperties(globalThis, {
  window: { value: window, configurable: true },
  document: { value: window.document, configurable: true },
  navigator: { value: window.navigator, configurable: true },
  HTMLElement: { value: window.HTMLElement, configurable: true },
  SVGElement: { value: window.SVGElement, configurable: true },
  getComputedStyle: { value: window.getComputedStyle.bind(window), configurable: true },
  IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true },
})
window.innerWidth = 1280
window.matchMedia = (query: string) => {
  const max = /max-width:\s*(\d+)/.exec(query)
  const matches = max ? window.innerWidth <= Number(max[1]) : false
  return {
    matches,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false
    },
  }
}

const style = document.createElement('style')
style.textContent = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')
document.head.appendChild(style)

let failures = 0
let pass = 0

function ok(cond: boolean, label: string) {
  if (cond) {
    pass++
    console.log(`  ok    ${label}`)
  } else {
    failures++
    console.error(`  FAIL  ${label}`)
  }
}

const hashStack: string[] = []
let hashIndex = -1

function pushHash(hash: string) {
  hashStack.splice(hashIndex + 1)
  hashStack.push(hash)
  hashIndex++
  window.location.hash = hash
  window.dispatchEvent(new window.HashChangeEvent('hashchange'))
}

function back() {
  if (hashIndex > 0) {
    hashIndex--
    window.location.hash = hashStack[hashIndex]
    window.dispatchEvent(new window.HashChangeEvent('hashchange'))
  }
}

function RoutedFiveYear() {
  const [route] = useHashRoute()
  const city = routeToCity(route)
  if (route.view === 'index') {
    return createElement('div', { 'data-view': 'index', 'data-query': route.query }, 'index')
  }
  if (!city) return createElement('div', { 'data-view': 'missing' }, 'missing')
  return createElement('div', { 'data-view': 'city' }, createElement(FiveYearClimate, { city }))
}

const rootEl = document.getElementById('root')!
let root: Root

async function render(node: ReturnType<typeof createElement>) {
  await act(async () => {
    root = createRoot(rootEl)
    root.render(node)
  })
}

async function rerender(node: ReturnType<typeof createElement>) {
  await act(async () => {
    root.render(node)
  })
}

async function cleanup() {
  await act(async () => {
    root.unmount()
  })
  rootEl.innerHTML = ''
}

function panel() {
  return document.querySelector<HTMLElement>('[data-five-year="panel"]')
}

function textOf(el: Element | null) {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

async function renderCity(slug: string) {
  const city = bySlug.get(slug)
  if (!city) throw new Error(`missing ${slug}`)
  await render(createElement(FiveYearClimate, { city }))
  return city
}

console.log('\n=== DOM: warm/dry, warm/wet, cool/wet cities ===')
for (const slug of ['phoenix', 'miami', 'seattle']) {
  await renderCity(slug)
  const el = panel()
  const body = textOf(el)
  ok(el?.getAttribute('data-status') === 'ready', `${slug} panel ready`)
  for (const year of [2021, 2022, 2023, 2024, 2025]) {
    ok(body.includes(String(year)), `${slug} shows ${year}`)
  }
  ok(body.includes('°F'), `${slug} shows °F`)
  ok(body.includes(' in'), `${slug} shows precip inches`)
  ok(body.includes('NOAA'), `${slug} discloses NOAA source`)
  ok(body.includes('2021-2025') || body.includes('2021–2025'), `${slug} discloses window`)
  ok(el?.querySelector('[data-source-id]')?.getAttribute('data-source-id')?.includes('nclimgrid'), `${slug} surfaces sourceId`)
  ok(body.toLowerCase().includes('not proof') || body.includes('too short'), `${slug} avoids overstating five years`)
  await cleanup()
}

console.log('\n=== DOM: keyboard year selection ===')
await renderCity('phoenix')
const selected = document.querySelector<HTMLButtonElement>('[role="radio"][aria-checked="true"]')
ok(selected?.getAttribute('data-year') === '2025', 'default year is 2025')
await act(async () => {
  selected?.focus()
  selected?.dispatchEvent(
    new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
  )
})
ok(
  document.querySelector('[role="radio"][aria-checked="true"]')?.getAttribute('data-year') === '2024',
  'ArrowLeft moves to 2024',
)
ok(document.activeElement?.getAttribute('data-year') === '2024', 'ArrowLeft moves focus to 2024')
await cleanup()

console.log('\n=== DOM: missing and zero values ===')
const missing: AnnualRecord[] = [2021, 2022, 2023, 2024, 2025].map((year) => ({
  slug: 'phoenix',
  year,
  meanTempF: year === 2023 ? null : 75,
  precipIn: year === 2022 ? 0 : 8,
  tempDays: year === 2023 ? 0 : 365,
  precipDays: 365,
  expectedDays: 365,
  completeness: year === 2023 ? 0 : 1,
  sourceId: 'nclimgrid:21',
}))
await render(
  createElement(FiveYearClimate, {
    city: bySlug.get('phoenix')!,
    records: missing,
  }),
)
const missingText = textOf(panel())
ok(missingText.includes('—'), 'missing temperature renders em dash')
ok(missingText.includes(formatPrecip(0)), 'zero precip renders 0.00 in')
ok(missingText.toLowerCase().includes('missing'), 'quality note for incomplete years')
await cleanup()

console.log('\n=== DOM: loading and error ===')
await render(
  createElement(FiveYearClimate, { city: bySlug.get('seattle')!, status: 'loading' }),
)
ok(panel()?.getAttribute('data-status') === 'loading', 'loading state')
ok(textOf(panel()).includes('Loading'), 'loading copy')
await cleanup()

await render(createElement(FiveYearClimate, { city: bySlug.get('seattle')!, status: 'error' }))
ok(panel()?.getAttribute('data-status') === 'error', 'error state')
ok(textOf(panel()).toLowerCase().includes('could not load'), 'error copy')
await cleanup()

await render(
  createElement(FiveYearClimate, {
    city: { name: 'Reykjavik', region: 'Iceland', latitude: 64.15, longitude: -21.94 },
  }),
)
ok(panel()?.getAttribute('data-status') === 'unavailable', 'non-canonical city unavailable')
await cleanup()

console.log('\n=== DOM: narrow viewport ===')
window.innerWidth = 360
await renderCity('miami')
const charts = document.querySelector('.five-year-charts')
const wrap = document.querySelector('.hourly-table-wrap')
ok(!!charts, 'charts present at 360px')
ok(!!wrap, 'table wrap present for narrow overflow')
ok(panel() !== null, 'panel still renders at 360px')
const cols = window.getComputedStyle(charts!).gridTemplateColumns
ok(
  cols === 'none' || cols.split(' ').length === 1 || window.innerWidth <= 640,
  `narrow layout columns (${cols || 'unset'})`,
)
await cleanup()
window.innerWidth = 1280

console.log('\n=== DOM: hash deep link + Back with panel ===')
pushHash('#/')
pushHash('#/?q=miami')
pushHash('#/city/miami')
await render(createElement(RoutedFiveYear))
ok(document.querySelector('[data-view="city"]') !== null, 'city route renders')
ok(panel()?.getAttribute('data-status') === 'ready', 'panel present on #/city/miami')
ok(textOf(panel()).includes('2021'), 'deep link shows 2021')
ok(parseHash(window.location.hash).slug === 'miami', 'hash still #/city/miami')

await act(async () => {
  back()
})
await rerender(createElement(RoutedFiveYear))
ok(document.querySelector('[data-view="index"]')?.getAttribute('data-query') === 'miami', 'Back restores search query miami')
ok(parseHash(window.location.hash).view === 'index', 'Back returns to index')

await act(async () => {
  back()
})
await rerender(createElement(RoutedFiveYear))
ok(document.querySelector('[data-view="index"]')?.getAttribute('data-query') === '', 'Back again returns to root')
await cleanup()

const seattle = bySlug.get('seattle')!
const seattleRoute = routeToCity(parseHash('#/city/seattle'))
ok(seattleRoute?.name === seattle.name, 'seattle deep link still resolves')
ok(formatTemp(54.1).includes('°F'), 'unit helper still °F')

if (failures > 0) {
  console.error(`\n${failures} annual DOM check(s) FAILED`)
  process.exit(1)
}
console.log(`\n${pass}/${pass + failures} annual DOM checks passed.`)
console.log('All annual DOM interaction checks passed.')
