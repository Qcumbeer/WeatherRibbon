import { readFileSync, readdirSync } from 'node:fs'

const EPS = 1e-9
let failures = 0

function check(cond: boolean, label: string) {
  if (!cond) {
    failures++
    console.error(`  FAIL  ${label}`)
  } else {
    console.log(`  ok    ${label}`)
  }
}

function fmt(v: number) {
  return v.toFixed(2)
}

interface ClimateMonth {
  month: string
  wind: number
  windBand: [number, number]
}

interface CityFile {
  name: string
  climate: ClimateMonth[]
}

const files = readdirSync('data').filter(
  (f) => f.endsWith('.json') && f !== 'world-cities.json',
)
check(files.length > 0, `found city datasets in data/ (${files.join(', ')})`)

for (const file of files) {
  const city: CityFile = JSON.parse(readFileSync(`data/${file}`, 'utf8'))
  const climate = city.climate
  console.log(`\n=== ${city.name} (${file}) ===`)

  const avgs = climate.map((m) => m.wind)
  const lows = climate.map((m) => m.windBand[0])
  const highs = climate.map((m) => m.windBand[1])

  let monthlyOk = true
  climate.forEach((m) => {
    if (!(m.windBand[0] >= 0)) {
      monthlyOk = false
      console.error(`    ${m.month}: lower band ${m.windBand[0]} < 0`)
    }
    if (!(m.windBand[0] <= m.wind && m.wind <= m.windBand[1])) {
      monthlyOk = false
      console.error(
        `    ${m.month}: ordering broken (${m.windBand[0]} <= ${m.wind} <= ${m.windBand[1]})`,
      )
    }
  })
  check(monthlyOk, 'monthly data: 0 <= 20th <= mean <= 80th')

  const minLo = Math.min(...lows)
  const maxHi = Math.max(...highs)
  check(minLo >= -EPS, `20th percentile stays >= 0 (min ${fmt(minLo)})`)
  check(
    lows.every((v, i) => v <= avgs[i] + EPS),
    '20th percentile never crosses above the mean',
  )
  check(
    highs.every((v, i) => v >= avgs[i] - EPS),
    '80th percentile never crosses below the mean',
  )

  const calmIdx = avgs.indexOf(Math.min(...avgs))
  const calmMonth = climate[calmIdx].month
  console.log(
    `  calmest month ${calmMonth}: mean ${fmt(avgs[calmIdx])} mph, 20th ${fmt(lows[calmIdx])} mph`,
  )
  check(
    lows[calmIdx] >= 0 && lows[calmIdx] <= avgs[calmIdx],
    `calm minimum (${calmMonth}) band is valid and above zero`,
  )
  if (file === 'seattle.json') {
    const isSummer = ['Jun', 'Jul', 'Aug', 'Sep'].includes(calmMonth)
    check(isSummer, 'Seattle calm minimum occurs in summer (edge case present)')
  }

  const windiest = climate.reduce((a, b) => (b.wind > a.wind ? b : a))
  const calmest = climate.reduce((a, b) => (b.wind < a.wind ? b : a))
  console.log(
    `  seasonal mean range: ${fmt(Math.min(...avgs))} - ${fmt(Math.max(...avgs))} mph ` +
      `(windiest ${windiest.month} ${fmt(windiest.wind)}, calmest ${calmest.month} ${fmt(calmest.wind)})`,
  )
  console.log(
    `  band envelope: 20th min ${fmt(minLo)} mph, 80th max ${fmt(maxHi)} mph`,
  )
  check(
    Number.isFinite(Math.min(...avgs)) && Number.isFinite(Math.max(...avgs)),
    'seasonal min/max are finite and readable',
  )
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll wind chart checks passed.')
