import { useState, useEffect, useRef } from 'react'
import { Send, AlertTriangle } from 'lucide-react'
import axios from 'axios'
import MapComponent from './components/Map.jsx'

const API_URL = 'http://localhost:8000'

function App() {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello. I am RoadSoS. How can I help you? Are you in an emergency?', sender: 'bot' }
  ])
  const [input, setInput] = useState('')
  const [results, setResults] = useState([])
  const [userLoc, setUserLoc] = useState(null)
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]) // Default India
  const messagesEndRef = useRef(null)

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
    if (!input.trim()) return

    const userText = input.trim()
    setMessages(prev => [...prev, { id: Date.now(), text: userText, sender: 'user' }])
    setInput('')

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
        
        setResults(nearbyRes.data.services)
      } else {
        setResults([])
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now()+2, text: "Sorry, I am having trouble connecting to the server.", sender: 'bot' }])
    }
  }

  const handleSOS = () => {
    // 112 is the National Emergency Number in India
    window.location.href = "tel:112"
  }

  return (
    <div className="app-container">
      {/* Sidebar Chat */}
      <div className="chat-panel">
        <div className="chat-header">
          <AlertTriangle color="#ef4444" size={28} />
          <h1>RoadSoS</h1>
        </div>
        
        <div className="chat-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`message ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        {results.length > 0 && (
          <div className="results-container">
            {results.map(res => (
              <div key={res.id} className="result-card">
                <div className="result-info">
                  <h3>{res.name}</h3>
                  <p>{(res.distance_meters / 1000).toFixed(1)} km away</p>
                </div>
                {res.phone && (
                  <a href={`tel:${res.phone}`} className="call-btn">Call</a>
                )}
              </div>
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
            />
            <button type="submit" className="send-btn">
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* Map Area */}
      <div className="map-container">
        <MapComponent center={mapCenter} results={results} userLoc={userLoc} />
      </div>

      {/* Panic Button */}
      <button className="sos-button" onClick={handleSOS}>
        SOS
      </button>
    </div>
  )
}

export default App
