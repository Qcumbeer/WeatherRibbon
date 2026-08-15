import { useId, useState, type KeyboardEvent } from 'react'
import {
  ANNUAL_META,
  ANNUAL_YEARS,
  annualForCity,
  fiveYearStatus,
  formatCompleteness,
  formatPrecip,
  formatTemp,
  signedDelta,
  summarizeWindow,
  type AnnualRecord,
  type FiveYearStatus,
} from './annual.ts'
import { type CityRef } from './cities.ts'

const EMPTY_RECORDS: AnnualRecord[] = []
const WIDTH = 640
const HEIGHT = 168
const ML = 40
const MR = 16
const MT = 12
const MB = 28
const PLOT_W = WIDTH - ML - MR
const PLOT_H = HEIGHT - MT - MB

function barYs(
  values: Array<number | null>,
  pad: number,
  includeZero = false,
): { lo: number; hi: number } {
  const nums = values.filter((v): v is number => v !== null && Number.isFinite(v))
  if (nums.length === 0) return { lo: 0, hi: 1 }
  const min = includeZero ? Math.min(0, ...nums) : Math.min(...nums)
  const max = Math.max(...nums)
  const span = max - min || 1
  return { lo: min - span * pad, hi: max + span * pad }
}

export function FiveYearClimate({
  city,
  records: recordsProp,
  status: statusProp,
}: {
  city: CityRef
  records?: AnnualRecord[] | null
  status?: FiveYearStatus
}) {
  const uid = useId()
  const titleId = `${uid}-title`
  const cautionId = `${uid}-caution`
  const resolved = recordsProp !== undefined ? recordsProp : annualForCity(city)
  const status = statusProp ?? fiveYearStatus(city, resolved)
  const records = resolved ?? EMPTY_RECORDS
  const [selectedYear, setSelectedYear] = useState<number>(ANNUAL_YEARS[ANNUAL_YEARS.length - 1])
  const selected = records.find((r) => r.year === selectedYear) ?? records[records.length - 1]
  const summary = summarizeWindow(records)

  if (status === 'loading') {
    return (
      <section className="five-year card muted" data-five-year="panel" data-status="loading">
        <h2 className="forecast-title">Recent years, 2021–2025</h2>
        <p>Loading five-year history…</p>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="five-year card muted" data-five-year="panel" data-status="error">
        <h2 className="forecast-title">Recent years, 2021–2025</h2>
        <p>Could not load five-year history for this city.</p>
      </section>
    )
  }

  if (status === 'unavailable' || !selected) {
    return (
      <section className="five-year card muted" data-five-year="panel" data-status="unavailable">
        <h2 className="forecast-title">Recent years, 2021–2025</h2>
        <p>
          Five-year history is published for the 100 canonical U.S. cities. This location is
          outside that set.
        </p>
      </section>
    )
  }

  const temps = records.map((r) => r.meanTempF)
  const precips = records.map((r) => r.precipIn)
  const tempScale = barYs(temps, 0.18)
  const precipScale = barYs(precips, 0.12, true)
  const slot = PLOT_W / Math.max(records.length, 1)
  const xAt = (i: number) => ML + slot * (i + 0.5)
  const yTemp = (v: number) =>
    MT + ((tempScale.hi - v) / (tempScale.hi - tempScale.lo || 1)) * PLOT_H
  const yPrecip = (v: number) =>
    MT + ((precipScale.hi - v) / (precipScale.hi - precipScale.lo || 1)) * PLOT_H
  const vsMeanTemp =
    selected.meanTempF !== null && summary.tempMean !== null
      ? selected.meanTempF - summary.tempMean
      : null
  const vsMeanPrecip =
    selected.precipIn !== null && summary.precipMean !== null
      ? selected.precipIn - summary.precipMean
      : null

  function onYearKey(e: KeyboardEvent<HTMLDivElement>) {
    const idx = records.findIndex((r) => r.year === selectedYear)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = records[Math.min(idx + 1, records.length - 1)]
      if (next) setSelectedYear(next.year)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = records[Math.max(idx - 1, 0)]
      if (next) setSelectedYear(next.year)
    } else if (e.key === 'Home') {
      e.preventDefault()
      if (records[0]) setSelectedYear(records[0].year)
    } else if (e.key === 'End') {
      e.preventDefault()
      const last = records[records.length - 1]
      if (last) setSelectedYear(last.year)
    }
  }

  return (
    <section
      className="five-year climate"
      data-five-year="panel"
      data-status="ready"
      aria-labelledby={titleId}
      aria-describedby={cautionId}
    >
      <h2 className="forecast-title" id={titleId}>
        Recent years, 2021–2025
      </h2>
      <p className="five-year-caution" id={cautionId}>
        Five complete calendar years show recent variability and direction in this window.
        They are not proof of a climate-change trend.
      </p>

      <div
        className="five-year-years"
        role="radiogroup"
        aria-label="Select a calendar year"
        onKeyDown={onYearKey}
      >
        {records.map((r) => {
          const on = r.year === selected.year
          return (
            <button
              key={r.year}
              type="button"
              role="radio"
              data-year={r.year}
              className={'five-year-year' + (on ? ' selected' : '')}
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => setSelectedYear(r.year)}
            >
              {r.year}
            </button>
          )
        })}
      </div>

      <div className="five-year-compare">
        <p>
          <strong>{selected.year}</strong> mean temperature {formatTemp(selected.meanTempF)}
          {vsMeanTemp !== null ? ` (${signedDelta(vsMeanTemp, '°F', 1)} vs 5-year mean)` : ''}
        </p>
        <p>
          <strong>{selected.year}</strong> total precipitation {formatPrecip(selected.precipIn)}
          {vsMeanPrecip !== null ? ` (${signedDelta(vsMeanPrecip, 'in', 2)} vs 5-year mean)` : ''}
        </p>
      </div>

      <div className="five-year-charts">
        <figure className="five-year-chart">
          <figcaption>Annual mean temperature (°F)</figcaption>
          <svg
            className="hourly-svg"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`${city.name} annual mean temperature in degrees Fahrenheit for 2021 through 2025`}
          >
            {records.map((r, i) => {
              if (r.meanTempF === null) return null
              const x = xAt(i)
              const y = yTemp(r.meanTempF)
              const h = Math.max(MT + PLOT_H - y, 2)
              const on = r.year === selected.year
              return (
                <g key={`t-${r.year}`}>
                  <rect
                    className={'five-year-bar temp' + (on ? ' selected' : '')}
                    x={x - slot * 0.28}
                    y={y}
                    width={slot * 0.56}
                    height={h}
                  />
                  <text className="hourly-axis hourly-tick" x={x} y={HEIGHT - 8} textAnchor="middle">
                    {r.year}
                  </text>
                </g>
              )
            })}
          </svg>
        </figure>
        <figure className="five-year-chart">
          <figcaption>Annual total precipitation (in)</figcaption>
          <svg
            className="hourly-svg"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`${city.name} annual total precipitation in inches for 2021 through 2025`}
          >
            {records.map((r, i) => {
              if (r.precipIn === null) return null
              const x = xAt(i)
              const y = yPrecip(r.precipIn)
              const zeroY = yPrecip(0)
              const h = Math.max(zeroY - y, 2)
              const on = r.year === selected.year
              return (
                <g key={`p-${r.year}`}>
                  <rect
                    className={'five-year-bar precip' + (on ? ' selected' : '')}
                    x={x - slot * 0.28}
                    y={y}
                    width={slot * 0.56}
                    height={h}
                  />
                  <text className="hourly-axis hourly-tick" x={x} y={HEIGHT - 8} textAnchor="middle">
                    {r.year}
                  </text>
                </g>
              )
            })}
          </svg>
        </figure>
      </div>

      <p className="five-year-direction">
        {summary.tempRange
          ? `Mean temperature ranged from ${summary.tempRange[0].toFixed(1)} to ${summary.tempRange[1].toFixed(1)} °F. `
          : 'Mean temperature is unavailable for this window. '}
        {summary.precipRange
          ? `Precipitation ranged from ${summary.precipRange[0].toFixed(2)} to ${summary.precipRange[1].toFixed(2)} in. `
          : 'Precipitation is unavailable for this window. '}
        {summary.tempDelta !== null
          ? `2025 was ${signedDelta(summary.tempDelta, '°F', 1)} versus 2021 in this window. `
          : ''}
        Five years is too short to establish a climate trend.
      </p>

      <dl className="five-year-source">
        <div>
          <dt>Source</dt>
          <dd>{ANNUAL_META.sourceName}</dd>
        </div>
        <div>
          <dt>Dataset</dt>
          <dd>{ANNUAL_META.source}</dd>
        </div>
        <div>
          <dt>Window</dt>
          <dd>{ANNUAL_META.window.label}</dd>
        </div>
        <div>
          <dt>Units</dt>
          <dd>
            {ANNUAL_META.units.meanTempF} · {ANNUAL_META.units.precipIn}
          </dd>
        </div>
        <div>
          <dt>License</dt>
          <dd>{ANNUAL_META.license}</dd>
        </div>
        <div>
          <dt>Quality</dt>
          <dd data-completeness={summary.minCompleteness}>
            Completeness {formatCompleteness(summary.minCompleteness)}
            {summary.minCompleteness < 1 ? ' — some years have missing daily observations' : ''}
          </dd>
        </div>
        <div>
          <dt>Record</dt>
          <dd data-source-id={selected.sourceId}>{selected.sourceId}</dd>
        </div>
      </dl>

      <details className="hourly-details">
        <summary>View five-year values</summary>
        <div className="hourly-table-wrap" tabIndex={0}>
          <table>
            <caption className="sr-only">
              {city.name} annual mean temperature in degrees Fahrenheit and annual total
              precipitation in inches, 2021 through 2025
            </caption>
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col">Mean temperature (°F)</th>
                <th scope="col">Total precipitation (in)</th>
                <th scope="col">Completeness</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.year} data-year-row={r.year}>
                  <th scope="row">{r.year}</th>
                  <td>{formatTemp(r.meanTempF)}</td>
                  <td>{formatPrecip(r.precipIn)}</td>
                  <td>{formatCompleteness(r.completeness)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
