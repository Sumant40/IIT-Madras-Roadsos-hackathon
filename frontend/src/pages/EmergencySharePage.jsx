import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { AlertTriangle } from 'lucide-react'
import MapComponent from '../components/Map.jsx'
import AccidentResults from '../components/AccidentResults.jsx'
import MapLegend from '../components/MapLegend.jsx'
import EmergencyOverlay from '../components/EmergencyOverlay.jsx'
import SosCard from '../components/SosCard.jsx'
import { API_URL, ACCIDENT_TYPES } from '../config.js'
import { saveSosCard, loadSosCard } from '../utils/sosCardStorage.js'

const DEFAULT_CENTER = [20.5937, 78.9629]

function getDirectionsUrl(destination) {
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.lat},${destination.lng}`,
    travelmode: 'driving',
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

function parseCoords(searchParams) {
  const lat = parseFloat(searchParams.get('lat'))
  const lng = parseFloat(searchParams.get('lng'))
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

export default function EmergencySharePage() {
  const [searchParams] = useSearchParams()
  const coords = parseCoords(searchParams)
  const label = searchParams.get('label') || 'Emergency location'

  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedResultId, setSelectedResultId] = useState(null)
  const [countryInfo, setCountryInfo] = useState(null)
  const [showSosCard, setShowSosCard] = useState(false)
  const [theme] = useState(() =>
    localStorage.getItem('roadsos-theme') === 'light' ? 'light' : 'dark'
  )

  const victimPin = coords ? { lat: coords.lat, lng: coords.lng, label } : null
  const mapCenter = coords ? [coords.lat, coords.lng] : DEFAULT_CENTER

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (!coords) {
      setIsLoading(false)
      setError('Invalid or missing location in link.')
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const [nearbyRes, countryRes] = await Promise.all([
          axios.post(`${API_URL}/emergency/nearby`, {
            lat: coords.lat,
            lng: coords.lng,
            radius_km: 15,
            types: ACCIDENT_TYPES,
            accident_mode: true,
            per_type_limit: 2,
          }),
          axios.get(`${API_URL}/emergency/country`, {
            params: { lat: coords.lat, lng: coords.lng },
          }),
        ])

        if (cancelled) return

        const services = nearbyRes.data.services
        setResults(services)
        setSelectedResultId(services[0]?.id ?? null)
        setCountryInfo(countryRes.data)

        saveSosCard({
          lat: coords.lat,
          lng: coords.lng,
          countryCode: countryRes.data.country_code,
          emergencyNumbers: countryRes.data.numbers,
          services,
        })
      } catch {
        if (!cancelled) {
          const cached = loadSosCard()
          if (cached?.services?.length) {
            setResults(cached.services)
            setCountryInfo({
              country_code: cached.countryCode,
              country_name: cached.countryCode,
              numbers: cached.emergencyNumbers,
            })
            setError('Offline — showing last saved services.')
          } else {
            setError('Could not load emergency services. Try again when online.')
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [coords?.lat, coords?.lng])

  const selectResult = (result) => {
    setSelectedResultId(result.id)
  }

  const selectedResult = results.find((r) => r.id === selectedResultId) ?? null
  const sosCardData = loadSosCard()

  if (!coords) {
    return (
      <div className="share-page share-page-error">
        <AlertTriangle size={32} color="#ef4444" />
        <h1>Invalid emergency link</h1>
        <p>This link needs valid lat and lng parameters.</p>
        <a href="/">Back to RoadSoS</a>
      </div>
    )
  }

  return (
    <div className="share-page" data-theme={theme}>
      <header className="share-banner">
        <AlertTriangle size={22} aria-hidden="true" />
        <div>
          <h1>Someone shared their emergency location</h1>
          <p>{label} · {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>
        </div>
        <a href="/" className="share-home-link">Open RoadSoS</a>
      </header>

      {error && <p className="share-error" role="status">{error}</p>}

      <div className="share-layout">
        <aside className="share-sidebar">
          {isLoading ? (
            <p className="share-loading">Loading nearest services…</p>
          ) : (
            <>
              <AccidentResults
                results={results}
                selectedResultId={selectedResultId}
                onSelectResult={selectResult}
                getDirectionsUrl={getDirectionsUrl}
              />
              <button
                type="button"
                className="sos-card-trigger"
                onClick={() => setShowSosCard(true)}
              >
                Offline SOS Card
              </button>
            </>
          )}
        </aside>

        <div className="share-map">
          <MapComponent
            center={mapCenter}
            results={results}
            victimPin={victimPin}
            theme={theme}
            selectedResult={selectedResult}
            onSelectResult={selectResult}
            getDirectionsUrl={getDirectionsUrl}
          />
          <MapLegend />
          <EmergencyOverlay countryInfo={countryInfo} />
        </div>
      </div>

      {showSosCard && (
        <SosCard data={sosCardData} onClose={() => setShowSosCard(false)} />
      )}
    </div>
  )
}
