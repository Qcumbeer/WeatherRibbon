import { useState } from 'react'
import './App.css'

type City = 'seattle' | 'san-francisco'

const CITIES: Record<
  City,
  { name: string; region: string; note: string }
> = {
  seattle: {
    name: 'Seattle',
    region: 'Washington',
    note: 'Puget Sound, evergreen hills, and a working waterfront.',
  },
  'san-francisco': {
    name: 'San Francisco',
    region: 'California',
    note: 'Fog, hills, and a bay that defines the city.',
  },
}

function App() {
  const [city, setCity] = useState<City | null>(null)
  const selected = city ? CITIES[city] : null

  return (
    <div className="shell">
      <header className="header">
        <p className="brand">Cities</p>
        <nav className="nav" aria-label="Cities">
          <button
            type="button"
            className={city === 'seattle' ? 'city-btn active' : 'city-btn'}
            aria-pressed={city === 'seattle'}
            onClick={() => setCity('seattle')}
          >
            Seattle
          </button>
          <button
            type="button"
            className={
              city === 'san-francisco' ? 'city-btn active' : 'city-btn'
            }
            aria-pressed={city === 'san-francisco'}
            onClick={() => setCity('san-francisco')}
          >
            San Francisco
          </button>
        </nav>
      </header>

      <main className="main">
        {selected ? (
          <article className="card">
            <p className="eyebrow">{selected.region}</p>
            <h1>{selected.name}</h1>
            <p>{selected.note}</p>
          </article>
        ) : (
          <article className="card muted">
            <h1>Choose a city</h1>
            <p>Select Seattle or San Francisco to see details.</p>
          </article>
        )}
      </main>
    </div>
  )
}

export default App
