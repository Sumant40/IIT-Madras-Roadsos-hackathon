import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, AlertTriangle, Map, MessageCircle, Moon, Navigation, Sun, Share2, CreditCard } from 'lucide-react'
import axios from 'axios'
import MapComponent from './components/Map.jsx'
import AccidentResults from './components/AccidentResults.jsx'
import MapLegend from './components/MapLegend.jsx'
import EmergencyOverlay from './components/EmergencyOverlay.jsx'
import GuidancePanel from './components/GuidancePanel.jsx'
import SosCard from './components/SosCard.jsx'
import { API_URL, ACCIDENT_TYPES } from './config.js'
import { saveSosCard, buildShareUrl, loadSosCard } from './utils/sosCardStorage.js'

const DEFAULT_CENTER = [20.5937, 78.9629]

function getInitialTheme() {
  const savedTheme = localStorage.getItem('roadsos-theme')
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function ResultSkeletons() {
  return (
    <div className="results-container" aria-label="Loading nearby services" aria-live="polite">
      {[0, 1, 2].map((item) => (
        <div className="result-card skeleton-card" key={item}>
          <div className="skeleton-copy">
            <span className="skeleton-line skeleton-title" />
            <span className="skeleton-line skeleton-meta" />
          </div>
          <span className="skeleton-button" />
        </div>
      ))}
    </div>
  )
}

function getDirectionsUrl(destination, userLoc) {
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.lat},${destination.lng}`,
    travelmode: 'driving'
  })
  if (userLoc) {
    params.set('origin', `${userLoc.lat},${userLoc.lng}`)
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

function App() {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello. I am RoadSoS. How can I help you? Are you in an emergency?', sender: 'bot' }
  ])
  const [input, setInput] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeMobileView, setActiveMobileView] = useState('chat')
  const [theme, setTheme] = useState(getInitialTheme)
  const [userLoc, setUserLoc] = useState(null)
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER)
  const [searchCenter, setSearchCenter] = useState(null)
  const [selectedResultId, setSelectedResultId] = useState(null)
  const [accidentMode, setAccidentMode] = useState(false)
  const [guidance, setGuidance] = useState([])
  const [countryInfo, setCountryInfo] = useState(null)
  const [showSosCard, setShowSosCard] = useState(false)
  const [shareToast, setShareToast] = useState(null)
  const messagesEndRef = useRef(null)

  const fetchCountryInfo = useCallback(async (lat, lng) => {
    try {
      const res = await axios.get(`${API_URL}/emergency/country`, { params: { lat, lng } })
      setCountryInfo(res.data)
      return res.data
    } catch (err) {
      console.error('Country lookup failed', err)
      return null
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('roadsos-theme', theme)
  }, [theme])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setUserLoc(loc)
          setMapCenter([loc.lat, loc.lng])
          await fetchCountryInfo(loc.lat, loc.lng)
        },
        (err) => console.error('Location error', err),
        { enableHighAccuracy: true, timeout: 5000 }
      )
    }
  }, [fetchCountryInfo])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!shareToast) return
    const t = setTimeout(() => setShareToast(null), 3000)
    return () => clearTimeout(t)
  }, [shareToast])

  const persistSosCard = (services, lat, lng, country) => {
    const info = country || countryInfo
    saveSosCard({
      lat,
      lng,
      countryCode: info?.country_code,
      emergencyNumbers: info?.numbers,
      services,
    })
  }

  const fetchNearby = async (lat, lng, { isAccident, types, serviceType }) => {
    const payload = {
      lat,
      lng,
      radius_km: 15.0,
    }

    if (isAccident) {
      payload.accident_mode = true
      payload.types = types || ACCIDENT_TYPES
      payload.per_type_limit = 2
    } else {
      payload.types = [serviceType]
    }

    const nearbyRes = await axios.post(`${API_URL}/emergency/nearby`, payload)
    return nearbyRes.data.services
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userText = input.trim()
    setMessages(prev => [...prev, { id: Date.now(), text: userText, sender: 'user' }])
    setInput('')
    setIsLoading(true)
    setResults([])
    setSelectedResultId(null)
    setGuidance([])
    setAccidentMode(false)
    setActiveMobileView('chat')

    try {
      const chatRes = await axios.post(`${API_URL}/chat/`, {
        message: userText,
        user_lat: userLoc?.lat,
        user_lng: userLoc?.lng
      })

      const { message, suggested_action, guidance: guidanceSteps } = chatRes.data

      setMessages(prev => [...prev, { id: Date.now() + 1, text: message, sender: 'bot' }])

      if (guidanceSteps?.length) {
        setGuidance(guidanceSteps)
      }

      const lat = suggested_action?.search_lat ?? userLoc?.lat
      const lng = suggested_action?.search_lng ?? userLoc?.lng
      const isAccident = suggested_action?.accident_mode

      if (lat != null && lng != null && (
        isAccident ||
        (suggested_action?.service_type) ||
        (suggested_action?.service_types?.length)
      )) {
        setMapCenter([lat, lng])
        setSearchCenter({ lat, lng })

        const country = await fetchCountryInfo(lat, lng)
        setAccidentMode(!!isAccident)

        const services = await fetchNearby(lat, lng, {
          isAccident,
          types: suggested_action.service_types,
          serviceType: suggested_action.service_type,
        })

        setResults(services)
        setSelectedResultId(services[0]?.id ?? null)
        setActiveMobileView('map')
        persistSosCard(services, lat, lng, country)

        if (guidanceSteps?.length) {
          const guidanceText = guidanceSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')
          setMessages(prev => [
            ...prev,
            { id: Date.now() + 2, text: `While you wait:\n${guidanceText}`, sender: 'bot' },
          ])
        }
      } else {
        setResults([])
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 2, text: 'Sorry, I am having trouble connecting to the server.', sender: 'bot' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTheme = () => {
    setTheme(current => current === 'dark' ? 'light' : 'dark')
  }

  const selectResult = (result) => {
    setSelectedResultId(result.id)
    setMapCenter([result.lat, result.lng])
    setActiveMobileView('map')
  }

  const handleShareLocation = async () => {
    const center = searchCenter || userLoc
    if (!center) {
      setShareToast('Enable location or search first.')
      return
    }

    const url = buildShareUrl(center.lat, center.lng)

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'RoadSoS Emergency Location',
          text: 'I need help — open this link to see my location and nearest services.',
          url,
        })
        setShareToast('Link shared.')
      } else {
        await navigator.clipboard.writeText(url)
        setShareToast('Link copied to clipboard.')
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(url)
          setShareToast('Link copied to clipboard.')
        } catch {
          setShareToast(url)
        }
      }
    }
  }

  const selectedResult = results.find((result) => result.id === selectedResultId) ?? null
  const shareCenter = searchCenter || userLoc
  const primaryEmergency = countryInfo?.numbers?.ambulance || '112'
  const sosLabel = countryInfo ? `SOS ${primaryEmergency}` : 'SOS 112'

  return (
    <div className="app-container" data-mobile-view={activeMobileView}>
      <section className="chat-panel" aria-label="RoadSoS chatbot">
        <div className="chat-header">
          <div className="brand-lockup">
            <AlertTriangle color="#ef4444" size={28} aria-hidden="true" />
            <h1>RoadSoS</h1>
            {accidentMode && (
              <span className="accident-mode-chip">Accident Mode</span>
            )}
          </div>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
        </div>

        <div className="mobile-tabs" role="tablist" aria-label="Mobile view">
          <button
            type="button"
            className={activeMobileView === 'chat' ? 'mobile-tab active' : 'mobile-tab'}
            onClick={() => setActiveMobileView('chat')}
            role="tab"
            aria-selected={activeMobileView === 'chat'}
          >
            <MessageCircle size={16} aria-hidden="true" />
            Chat
          </button>
          <button
            type="button"
            className={activeMobileView === 'map' ? 'mobile-tab active' : 'mobile-tab'}
            onClick={() => setActiveMobileView('map')}
            role="tab"
            aria-selected={activeMobileView === 'map'}
          >
            <Map size={16} aria-hidden="true" />
            Map
          </button>
        </div>

        <div className="chat-messages" id="chat-view" role="log" aria-live="polite">
          {messages.map(msg => (
            <div key={msg.id} className={`message ${msg.sender}`}>
              {msg.text.split('\n').map((line, i) => (
                <span key={i}>{line}{i < msg.text.split('\n').length - 1 && <br />}</span>
              ))}
            </div>
          ))}
          {isLoading && <div className="message bot loading-message">Finding nearby services...</div>}
          <div ref={messagesEndRef} />
        </div>

        {guidance.length > 0 && !isLoading && (
          <GuidancePanel steps={guidance} />
        )}

        {isLoading ? (
          <ResultSkeletons />
        ) : results.length > 0 && (
          accidentMode ? (
            <AccidentResults
              results={results}
              selectedResultId={selectedResultId}
              onSelectResult={selectResult}
              getDirectionsUrl={(res) => getDirectionsUrl(res, userLoc)}
            />
          ) : (
            <div className="results-container" aria-label="Nearby service results">
              {results.map(res => (
                <article
                  key={res.id}
                  className={selectedResultId === res.id ? 'result-card selected' : 'result-card'}
                  onClick={() => selectResult(res)}
                >
                  <div className="result-info">
                    <h3>{res.name}</h3>
                    <p>{(res.distance_meters / 1000).toFixed(1)} km away</p>
                  </div>
                  <div className="result-actions">
                    <button
                      type="button"
                      className="view-btn"
                      onClick={(event) => { event.stopPropagation(); selectResult(res) }}
                    >
                      <Map size={15} aria-hidden="true" />
                      View
                    </button>
                    <a
                      href={getDirectionsUrl(res, userLoc)}
                      className="directions-btn"
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Navigation size={15} aria-hidden="true" />
                      Directions
                    </a>
                    {res.phone && (
                      <a href={`tel:${res.phone}`} className="call-btn" onClick={(e) => e.stopPropagation()}>
                        Call
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )
        )}

        {(shareCenter || results.length > 0) && !isLoading && (
          <div className="emergency-actions-bar">
            {shareCenter && (
              <button type="button" className="share-location-btn" onClick={handleShareLocation}>
                <Share2 size={16} aria-hidden="true" />
                Share location
              </button>
            )}
            {results.length > 0 && (
              <button type="button" className="sos-card-trigger" onClick={() => setShowSosCard(true)}>
                <CreditCard size={16} aria-hidden="true" />
                Offline SOS Card
              </button>
            )}
          </div>
        )}

        {shareToast && (
          <p className="share-toast" role="status">{shareToast}</p>
        )}

        <div className="chat-input-container">
          <form className="chat-form" onSubmit={handleSend}>
            <input
              type="text"
              className="chat-input"
              placeholder='E.g., "I just had an accident"...'
              value={input}
              onChange={e => setInput(e.target.value)}
              aria-label="Emergency message"
              disabled={isLoading}
            />
            <button type="submit" className="send-btn" aria-label="Send emergency message" disabled={isLoading}>
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
        </div>
      </section>

      <div className="map-container" id="map-view" role="region" aria-label="Emergency services map">
        <MapComponent
          center={mapCenter}
          results={results}
          userLoc={userLoc}
          theme={theme}
          selectedResult={selectedResult}
          onSelectResult={selectResult}
          getDirectionsUrl={(result) => getDirectionsUrl(result, userLoc)}
        />
        {accidentMode && <MapLegend />}
        <EmergencyOverlay countryInfo={countryInfo} />
      </div>

      <a
        className="sos-button"
        href={`tel:${primaryEmergency}`}
        aria-label={`Call emergency number ${primaryEmergency}`}
      >
        {sosLabel}
      </a>

      {showSosCard && (
        <SosCard data={loadSosCard()} onClose={() => setShowSosCard(false)} />
      )}
    </div>
  )
}

export default App
