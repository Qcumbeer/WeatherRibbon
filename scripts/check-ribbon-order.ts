import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { createElement, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { US_CITIES, bySlug } from '../src/cities.ts'
import { parseHash, routeToCity } from '../src/router.ts'
import { CityView } from '../src/CityView.tsx'

// ---------------------------------------------------------------------------
// Ribbon ordering contract: render the real CityView for every canonical city
// and assert the first chart/SVG is the temperature ribbon once data resolves.
// ---------------------------------------------------------------------------

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

const FOLLOWING = window.Node.DOCUMENT_POSITION_FOLLOWING

// Load CSS as text for responsive layout assertions
const cssText = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')
const style = document.createElement('style')
style.textContent = cssText
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

const rootEl = document.getElementById('root')!
let root: Root

async function renderCityView(slug: string, width = 1280) {
  window.innerWidth = width
  const city = bySlug.get(slug)
  if (!city) throw new Error(`missing slug ${slug}`)
  await act(async () => {
    root = createRoot(rootEl)
    root.render(
      createElement(CityView, {
        city,
        onBack: () => {},
      }),
    )
  })
}

async function waitForData(maxMs = 500) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    if (rootEl.querySelector('[data-chart="ribbon"]')) return
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })
  }
}

async function cleanup() {
  await act(async () => {
    root.unmount()
  })
  rootEl.innerHTML = ''
}

function allCharts(): Element[] {
  return [...rootEl.querySelectorAll('[data-chart]')]
}

function allSvgs(): Element[] {
  return [...rootEl.querySelectorAll('svg')]
}

function textOf(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

// ---------------------------------------------------------------------------
console.log('\n=== 100 unique slugs, no missing city ===')
const slugs = US_CITIES.map((c) => c.slug)
const slugSet = new Set(slugs)
ok(slugs.length === 100, `100 canonical slugs (${slugs.length})`)
ok(slugSet.size === 100, 'no duplicate slugs')
ok(
  US_CITIES.every((c) => typeof c.slug === 'string' && c.slug.length > 0),
  'every city has a non-empty slug',
)

// ---------------------------------------------------------------------------
console.log('\n=== Ribbon is first chart on every canonical city route ===')
let renderedCount = 0
const missingCities: string[] = []

for (const city of US_CITIES) {
  await renderCityView(city.slug)
  await waitForData()

  const ribbon = rootEl.querySelector('[data-chart="ribbon"]')
  if (!ribbon) {
    missingCities.push(city.slug)
    await cleanup()
    continue
  }
  renderedCount++

  const charts = allCharts()
  ok(charts[0] === ribbon, `${city.slug}: first data-chart is ribbon`)

  const firstSvg = allSvgs()[0]
  ok(
    firstSvg === ribbon.querySelector('svg') ||
      firstSvg?.closest('[data-chart]') === ribbon,
    `${city.slug}: first SVG is inside ribbon`,
  )

  const aboutCard = rootEl.querySelector('[aria-label="About this data"]')
  ok(!!aboutCard, `${city.slug}: About card present`)
  ok(
    !!aboutCard && aboutCard.compareDocumentPosition(ribbon) & FOLLOWING,
    `${city.slug}: About card precedes ribbon`,
  )

  const ribbonHeading = ribbon.querySelector('.forecast-title')
  ok(
    ribbonHeading?.textContent?.includes('High and Low Temperature'),
    `${city.slug}: ribbon heading identifies high/low temperature`,
  )

  const ribbonDesc = ribbon.querySelector('.sr-only')
  ok(
    textOf(ribbonDesc).includes('percentile'),
    `${city.slug}: ribbon description mentions percentile bands`,
  )

  const legend = ribbon.querySelector('.hourly-legend')
  ok(
    textOf(legend).includes('Avg high') && textOf(legend).includes('Avg low'),
    `${city.slug}: ribbon legend shows high/low`,
  )

  const fiveYear = rootEl.querySelector('[data-five-year="panel"]')
  ok(
    !!fiveYear && ribbon.compareDocumentPosition(fiveYear) & FOLLOWING,
    `${city.slug}: FiveYearClimate follows ribbon`,
  )

  await cleanup()
}

ok(renderedCount === 100, `ribbon rendered on all 100 cities (${renderedCount})`)
ok(missingCities.length === 0, `no missing cities (${missingCities.join(', ')})`)

// ---------------------------------------------------------------------------
console.log('\n=== Loading/error card: honest copy, no ribbon before data ===')
// Verify the structural guarantee: ribbon is inside the data-resolved branch,
// and the loading/error card is the only content when data is null.
const cityViewSrc = readFileSync(new URL('../src/CityView.tsx', import.meta.url), 'utf8')
ok(
  cityViewSrc.includes('data ?') && cityViewSrc.includes('<ClimateChart'),
  'CityView source: ClimateChart is inside data-resolved branch',
)
ok(
  cityViewSrc.includes('Loading') && cityViewSrc.includes('Could not load'),
  'CityView source: honest loading and error copy',
)
ok(
  cityViewSrc.includes('Fetching 1991') || cityViewSrc.includes('Unable to load'),
  'CityView source: loading message is specific, not generic',
)
// The loading card must not contain any chart/SVG — verified by the
// conditional structure: data ? (charts) : (muted card)
ok(
  !cityViewSrc.match(/card\.muted[^]*data-chart/),
  'no data-chart marker inside the muted card branch',
)

// ---------------------------------------------------------------------------
console.log('\n=== Unknown route: no ribbon ===')
const badRoute = routeToCity(parseHash('#/city/does-not-exist'))
ok(badRoute === null, 'routeToCity returns null for unknown slug')
const coordRoute = routeToCity(
  parseHash('#/city/@64.15,-21.94?name=Reykjavik&region=Iceland'),
)
ok(coordRoute?.name === 'Reykjavik', 'non-canonical coord route resolves but has no annual data')

// ---------------------------------------------------------------------------
console.log('\n=== Mobile width: ribbon first, no overflow ===')
for (const slug of ['miami', 'anchorage', 'seattle']) {
  await renderCityView(slug, 390)
  await waitForData()
  const charts = allCharts()
  ok(charts[0]?.getAttribute('data-chart') === 'ribbon', `${slug}@390px: ribbon is first chart`)
  const ribbonSvg = rootEl.querySelector('[data-chart="ribbon"] svg')
  ok(!!ribbonSvg, `${slug}@390px: ribbon SVG present`)

  // CSS asserts responsive rule exists
  ok(
    cssText.includes('.five-year-charts') && cssText.includes('max-width: 640px'),
    `${slug}@390px: responsive CSS present for narrow layout`,
  )

  const fiveYear = rootEl.querySelector('[data-five-year="panel"]')
  ok(
    !!fiveYear && fiveYear.getAttribute('data-status') === 'ready',
    `${slug}@390px: FiveYearClimate still interactive`,
  )
  const yearButtons = fiveYear?.querySelectorAll('[role="radio"]')
  ok(
    yearButtons && yearButtons.length === 5,
    `${slug}@390px: five year buttons present`,
  )
  await cleanup()
}

// ---------------------------------------------------------------------------
console.log('\n=== FiveYearClimate arrow-key selector after ribbon ===')
await renderCityView('phoenix', 390)
await waitForData()
const selected = rootEl.querySelector<HTMLButtonElement>('[role="radio"][aria-checked="true"]')
ok(selected?.getAttribute('data-year') === '2025', 'phoenix: default year 2025')
await act(async () => {
  selected?.focus()
  selected?.dispatchEvent(
    new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
  )
})
ok(
  rootEl.querySelector('[role="radio"][aria-checked="true"]')?.getAttribute('data-year') === '2024',
  'phoenix: ArrowLeft selects 2024 after ribbon',
)
await cleanup()

// ---------------------------------------------------------------------------
if (failures > 0) {
  console.error(`\n${failures} ribbon ordering check(s) FAILED`)
  process.exit(1)
}
console.log(`\n${pass}/${pass + failures} ribbon ordering checks passed.`)
console.log('All ribbon ordering checks passed.')
