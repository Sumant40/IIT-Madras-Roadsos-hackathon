import { Map, Navigation } from 'lucide-react'
import { SERVICE_SECTIONS } from '../config.js'

export default function AccidentResults({
  results,
  selectedResultId,
  onSelectResult,
  getDirectionsUrl,
}) {
  const byType = SERVICE_SECTIONS.map((section) => ({
    ...section,
    items: results.filter((r) => r.type === section.type),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="results-container accident-results" aria-label="Accident mode services by type">
      {byType.map((group) => (
        <section key={group.type} className="accident-section">
          <h2 className="accident-section-title" style={{ borderColor: group.color }}>
            <span className="accident-dot" style={{ background: group.color }} aria-hidden="true" />
            {group.label}
          </h2>
          {group.items.map((res) => (
            <article
              key={res.id}
              className={selectedResultId === res.id ? 'result-card selected' : 'result-card'}
              onClick={() => onSelectResult(res)}
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
                    onSelectResult(res)
                  }}
                >
                  <Map size={15} aria-hidden="true" />
                  View
                </button>
                <a
                  href={getDirectionsUrl(res)}
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
        </section>
      ))}
    </div>
  )
}
