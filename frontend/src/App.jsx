import { useState, useEffect, useRef } from 'react'
import { Send, AlertTriangle, Map, MessageCircle, Moon, Navigation, Sun } from 'lucide-react'
import axios from 'axios'
import MapComponent from './components/Map.jsx'

const API_URL = 'http://localhost:8000'
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
  const [selectedResultId, setSelectedResultId] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('roadsos-theme', theme)
  }, [theme])

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setUserLoc(loc)
          setMapCenter([loc.lat, loc.lng])
        },
        (err) => console.error("Location error", err),
        { enableHighAccuracy: true, timeout: 5000 }
      )
    }
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userText = input.trim()
    setMessages(prev => [...prev, { id: Date.now(), text: userText, sender: 'user' }])
    setInput('')
    setIsLoading(true)
    setResults([])
    setSelectedResultId(null)
    setActiveMobileView('chat')

    try {
      // 1. Send to Chat endpoint
      const chatRes = await axios.post(`${API_URL}/chat/`, {
        message: userText,
        user_lat: userLoc?.lat,
        user_lng: userLoc?.lng
      })
      
      const { message, suggested_action } = chatRes.data
      
      setMessages(prev => [...prev, { id: Date.now()+1, text: message, sender: 'bot' }])

      // 2. Fetch nearby services if an action is suggested
      if (suggested_action && suggested_action.service_type && suggested_action.search_lat) {
        setMapCenter([suggested_action.search_lat, suggested_action.search_lng])
        
        const nearbyRes = await axios.post(`${API_URL}/emergency/nearby`, {
          lat: suggested_action.search_lat,
          lng: suggested_action.search_lng,
          radius_km: 15.0,
          types: [suggested_action.service_type]
        })
        
        const services = nearbyRes.data.services
        setResults(services)
        setSelectedResultId(services[0]?.id ?? null)
        setActiveMobileView('map')
      } else {
        setResults([])
      }
    } catch {
      setMessages(prev => [...prev, { id: Date.now()+2, text: "Sorry, I am having trouble connecting to the server.", sender: 'bot' }])
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

  const selectedResult = results.find((result) => result.id === selectedResultId) ?? null

  return (
    <div className="app-container" data-mobile-view={activeMobileView}>
      {/* Sidebar Chat */}
      <section className="chat-panel" aria-label="RoadSoS chatbot">
        <div className="chat-header">
          <div className="brand-lockup">
            <AlertTriangle color="#ef4444" size={28} aria-hidden="true" />
            <h1>RoadSoS</h1>
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
            aria-controls="chat-view"
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
            aria-controls="map-view"
          >
            <Map size={16} aria-hidden="true" />
            Map
          </button>
        </div>
        
        <div className="chat-messages" id="chat-view" role="log" aria-live="polite" aria-label="Conversation">
          {messages.map(msg => (
            <div key={msg.id} className={`message ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
          {isLoading && <div className="message bot loading-message">Finding nearby services...</div>}
          <div ref={messagesEndRef} />
        </div>
        
        {isLoading ? (
          <ResultSkeletons />
        ) : results.length > 0 && (
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
                    aria-pressed={selectedResultId === res.id}
                    aria-label={`View ${res.name} on map`}
                    onClick={(event) => {
                      event.stopPropagation()
                      selectResult(res)
                    }}
                  >
                    <Map size={15} aria-hidden="true" />
                    View
                  </button>
                  <a
                    href={getDirectionsUrl(res, userLoc)}
                    className="directions-btn"
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Get directions to ${res.name}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Navigation size={15} aria-hidden="true" />
                    Directions
                  </a>
                  {res.phone && (
                    <a
                      href={`tel:${res.phone}`}
                      className="call-btn"
                      aria-label={`Call ${res.name}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      Call
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="chat-input-container">
          <form className="chat-form" onSubmit={handleSend}>
            <input 
              type="text" 
              className="chat-input"
              placeholder="E.g., I need an ambulance nearby..."
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

      {/* Map Area */}
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
      </div>

      {/* Panic Button */}
      <a className="sos-button" href="tel:112" aria-label="Call India's national emergency number 112">
        SOS
      </a>
    </div>
  )
}

export default App
