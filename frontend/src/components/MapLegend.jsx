export default function MapLegend() {
  return (
    <div className="map-legend" aria-label="Map legend">
      <span className="map-legend-title">Accident Mode</span>
      <ul>
        <li><span className="legend-dot legend-red" /> Hospital / Ambulance</li>
        <li><span className="legend-dot legend-blue" /> Police</li>
        <li><span className="legend-dot legend-grey" /> Tow</li>
        <li><span className="legend-dot legend-green" /> You</li>
      </ul>
    </div>
  )
}
