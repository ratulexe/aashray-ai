import { ArrowRight, MapPin, Navigation, Radio, TriangleAlert } from 'lucide-react'

function getLocationCopy(locationStatus) {
  if (locationStatus === 'ready') {
    return 'Current location loaded'
  }

  if (locationStatus === 'denied') {
    return 'Permission denied; using demo location'
  }

  if (locationStatus === 'unsupported') {
    return 'Current location unavailable; using demo location'
  }

  if (locationStatus === 'fallback') {
    return 'Using demo location fallback'
  }

  return 'Checking current location'
}

export default function CinematicEmergencyCard({
  disaster,
  assessment,
  locationStatus,
  onFindShelter,
}) {
  const distanceLabel = Number.isFinite(assessment?.distanceKm)
    ? `${assessment.distanceKm.toFixed(1)} km from alert center`
    : 'Inside evacuation zone'

  return (
    <section className="surface-card emergency-alert-card" aria-labelledby="emergency-alert-heading">
      <div className="emergency-alert-accent" aria-hidden="true" />
      <div className="emergency-alert-body">
        <header className="emergency-alert-heading">
          <span className="emergency-alert-icon" aria-hidden="true">
            <TriangleAlert size={26} />
          </span>
          <div className="emergency-alert-title">
            <div className="emergency-alert-label">
              <p>Emergency alert</p>
              <span className="status-badge danger"><Radio size={12} aria-hidden="true" /> Active</span>
            </div>
            <h2 id="emergency-alert-heading">{disaster.title}</h2>
          </div>
        </header>

        <div className="emergency-next-step">
          <p>What to do now</p>
          <strong>
            {disaster.message ||
              'Your current location is inside the affected evacuation zone. Move to a designated safe shelter as soon as possible.'}
          </strong>
        </div>

        <div className="emergency-info-grid">
          <article className="emergency-info-panel risk-panel">
            <p>Risk level</p>
            <strong>{disaster.severity}</strong>
          </article>
          <article className="emergency-info-panel">
            <p>Affected area</p>
            <strong>{disaster.affectedArea}</strong>
          </article>
          <article className="emergency-info-panel">
            <p>Current location</p>
            <strong><MapPin size={17} aria-hidden="true" /> {getLocationCopy(locationStatus)}</strong>
          </article>
          <article className="emergency-info-panel">
            <p>Distance check</p>
            <strong>{distanceLabel}</strong>
          </article>
          <article className="emergency-info-panel duration-panel">
            <p>Expected duration</p>
            <strong>Approximately {disaster.expectedDurationHours} hours</strong>
          </article>
        </div>

        <button type="button" className="button-danger emergency-primary-action" onClick={onFindShelter}>
          <Navigation size={19} aria-hidden="true" />
          Find Safe Shelter
          <ArrowRight size={18} aria-hidden="true" />
        </button>

        <p className="emergency-ai-explanation">
          Shelter matching checks current safety, capacity, distance,
          accessibility, and route information.
        </p>
      </div>
    </section>
  )
}
