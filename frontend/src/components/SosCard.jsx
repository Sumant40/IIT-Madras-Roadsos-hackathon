import { Printer, X } from 'lucide-react'

export default function SosCard({ data, onClose }) {
  if (!data) return null

  const { lat, lng, countryCode, emergencyNumbers, services, savedAt } = data

  return (
    <div className="sos-card-overlay" role="dialog" aria-label="Offline SOS card">
      <div className="sos-card-modal">
        <div className="sos-card-actions no-print">
          <button type="button" className="sos-card-btn" onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" />
            Print / Save PDF
          </button>
          <button type="button" className="sos-card-close" onClick={onClose} aria-label="Close SOS card">
            <X size={18} />
          </button>
        </div>

        <article className="sos-card-printable" id="sos-card-print">
          <header className="sos-card-header">
            <h1>RoadSoS Emergency Card</h1>
            <p className="sos-card-meta">
              Location: {lat?.toFixed(4)}, {lng?.toFixed(4)} · {countryCode || '—'}
            </p>
            {savedAt && <p className="sos-card-meta">Saved: {new Date(savedAt).toLocaleString()}</p>}
          </header>

          {emergencyNumbers && (
            <section className="sos-card-section">
              <h2>National emergency</h2>
              <ul>
                <li>Ambulance: <strong>{emergencyNumbers.ambulance}</strong></li>
                <li>Police: <strong>{emergencyNumbers.police}</strong></li>
                {emergencyNumbers.fire && (
                  <li>Fire: <strong>{emergencyNumbers.fire}</strong></li>
                )}
              </ul>
            </section>
          )}

          <section className="sos-card-section">
            <h2>Nearest services (cached)</h2>
            {services?.length ? (
              <ul className="sos-card-services">
                {services.map((s, i) => (
                  <li key={`${s.type}-${s.name}-${i}`}>
                    <strong>{s.type}</strong> — {s.name}
                    {s.phone ? ` · ${s.phone}` : ''}
                    {s.distance_meters != null && (
                      <span> ({(s.distance_meters / 1000).toFixed(1)} km)</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No cached services. Search while online first.</p>
            )}
          </section>

          <footer className="sos-card-footer">
            <p>Keep this card in your vehicle. Works offline after one online search.</p>
          </footer>
        </article>
      </div>
    </div>
  )
}
