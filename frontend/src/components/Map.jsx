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
const getCustomIcon = (type) => {
  let color = 'blue'
  if (type === 'hospital' || type === 'ambulance') color = 'red'
  if (type === 'police') color = 'blue'
  if (type === 'fire_station') color = 'orange'
  if (type === 'towing') color = 'grey'
  if (type === 'user') color = 'green'
  
  // A simple SVG string icon
  const svg = `
    <svg width="24" height="36" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.383 0 0 5.383 0 12c0 9 12 24 12 24s12-15 12-24c0-6.617-5.383-12-12-12z" fill="${color}"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>`
    
  return L.divIcon({
    className: 'custom-icon',
    html: svg,
    iconSize: [24, 36],
    iconAnchor: [12, 36]
  })
}

// Map updater component to fly to new center
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 13, { animate: true });
  }, [center, map]);
  return null;
}

export default function MapComponent({ center, results, userLoc }) {
  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
      {/* Dark theme tiles from CartoDB */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
      />
      <MapUpdater center={center} />
      
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
        <Marker key={res.id} position={[res.lat, res.lng]} icon={getCustomIcon(res.type)}>
          <Popup>
            <div style={{ color: '#0f172a' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{res.name}</h3>
              <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>Type: {res.type}</p>
              <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>{(res.distance_meters / 1000).toFixed(1)} km</p>
              {res.phone && <a href={`tel:${res.phone}`} style={{ color: '#22c55e', fontWeight: 'bold' }}>Call {res.phone}</a>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
