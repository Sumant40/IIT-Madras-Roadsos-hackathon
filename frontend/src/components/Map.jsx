import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix default Leaflet icon paths
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png'
import iconNormal from 'leaflet/dist/images/marker-icon.png'
import shadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
    iconUrl: iconNormal,
    iconRetinaUrl: iconRetina,
    shadowUrl: shadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons based on service type
const getCustomIcon = (type, selected = false) => {
  let color = 'blue'
  if (type === 'hospital' || type === 'ambulance') color = 'red'
  if (type === 'police') color = 'blue'
  if (type === 'fire_station') color = 'orange'
  if (type === 'towing') color = 'grey'
  if (type === 'user') color = 'green'
  
  // A simple SVG string icon
  const svg = `
    <svg width="${selected ? 30 : 24}" height="${selected ? 44 : 36}" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.383 0 0 5.383 0 12c0 9 12 24 12 24s12-15 12-24c0-6.617-5.383-12-12-12z" fill="${color}"/>
      <circle cx="12" cy="12" r="${selected ? 6 : 5}" fill="white"/>
    </svg>`
    
  return L.divIcon({
    className: selected ? 'custom-icon selected-marker' : 'custom-icon',
    html: svg,
    iconSize: selected ? [30, 44] : [24, 36],
    iconAnchor: selected ? [15, 44] : [12, 36]
  })
}

const tileThemes = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CartoDB</a>'
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CartoDB</a>'
  }
}

// Map updater component to fit loaded results or fly to the active search center.
function MapUpdater({ center, results, selectedResult }) {
  const map = useMap();
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (selectedResult) {
      map.flyTo([selectedResult.lat, selectedResult.lng], 16, {
        animate: !reduceMotion,
        duration: reduceMotion ? 0 : 0.7
      })
      return
    }

    if (results.length > 0) {
      const points = results.map((res) => [res.lat, res.lng])
      const bounds = L.latLngBounds(points)
      map.fitBounds(bounds, {
        animate: !reduceMotion,
        duration: reduceMotion ? 0 : 0.8,
        maxZoom: 15,
        padding: [48, 48]
      })
      return
    }

    map.flyTo(center, 13, {
      animate: !reduceMotion,
      duration: reduceMotion ? 0 : 0.8
    });
  }, [center, results, selectedResult, map]);
  return null;
}

export default function MapComponent({
  center,
  results,
  userLoc,
  theme = 'dark',
  selectedResult,
  onSelectResult,
  getDirectionsUrl
}) {
  const tiles = tileThemes[theme] || tileThemes.dark

  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
      {/* Theme-aware tiles from CartoDB */}
      <TileLayer
        key={theme}
        url={tiles.url}
        attribution={tiles.attribution}
      />
      <MapUpdater center={center} results={results} selectedResult={selectedResult} />
      
      {/* User Location */}
      {userLoc && (
        <>
          <Marker position={[userLoc.lat, userLoc.lng]} icon={getCustomIcon('user')}>
            <Popup>You are here</Popup>
          </Marker>
          <Circle center={[userLoc.lat, userLoc.lng]} radius={15000} pathOptions={{ color: 'rgba(34, 197, 94, 0.2)', fillColor: 'rgba(34, 197, 94, 0.05)' }} />
        </>
      )}

      {/* Results Markers */}
      {results.map((res) => (
        <Marker
          key={res.id}
          position={[res.lat, res.lng]}
          icon={getCustomIcon(res.type, selectedResult?.id === res.id)}
          eventHandlers={{
            click: () => onSelectResult?.(res)
          }}
        >
          <Popup>
            <div className="map-popup">
              <h3>{res.name}</h3>
              <p>Type: {res.type}</p>
              <p>{(res.distance_meters / 1000).toFixed(1)} km away</p>
              <div className="map-popup-actions">
                {getDirectionsUrl && (
                  <a href={getDirectionsUrl(res)} target="_blank" rel="noreferrer">
                    Directions
                  </a>
                )}
                {res.phone && <a href={`tel:${res.phone}`}>Call {res.phone}</a>}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
