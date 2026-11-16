import { Accessibility, Baby, Building2, Clock3, UserRound, Users } from 'lucide-react'

const detailItems = [
  { key: 'adults', label: 'Adults', icon: UserRound },
  { key: 'children', label: 'Children', icon: Baby },
  { key: 'elderly', label: 'Elderly', icon: Users },
]

function displayValue(value) { return value ?? 'Not provided' }

function getStatusPresentation(status) {
  const states = {
    RESERVED: { label: 'Reserved', tone: 'info' },
    ARRIVED: { label: 'Arrived', tone: 'success' },
    EXPIRED: { label: 'Expired', tone: 'warning' },
    CANCELLED: { label: 'Cancelled', tone: 'danger' },
  }

  return states[status] ?? { label: displayValue(status), tone: 'info' }
}

function formatExpiresAt(value) {
  if (!value) return null
  let expirationDate = null
  if (value instanceof Date) expirationDate = value
  else if (typeof value?.toDate === 'function') expirationDate = value.toDate()
  else if (typeof value?.seconds === 'number') expirationDate = new Date(value.seconds * 1000)
  else if (typeof value === 'string' || typeof value === 'number') expirationDate = new Date(value)
  if (!expirationDate || Number.isNaN(expirationDate.getTime())) return 'Expiration recorded'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(expirationDate)
}

export default function ReservationDetails({ reservation }) {
  const family = reservation.family ?? {}
  const status = getStatusPresentation(reservation.status)
  const expiresAt = formatExpiresAt(reservation.expiresAt)
  const mobilityAssistance = family.mobilityAssistance
  const mobilityMessage = mobilityAssistance === true
    ? 'Mobility assistance is required. Prepare an accessible intake route.'
    : mobilityAssistance === false
      ? 'No mobility assistance requested.'
      : 'Mobility assistance information was not provided.'

  return (
    <section className="surface-card operator-card verified-card" aria-labelledby="reservation-details-heading">
      <div className="operator-card-heading">
        <div>
          <p className="operator-section-label">Reservation Verified</p>
          <h2 id="reservation-details-heading" className="verified-code">{reservation.code}</h2>
        </div>
        <span className={`status-badge ${status.tone}`}>{status.label}</span>
      </div>

      <div className="group-size">
        <span>Group size</span>
        <strong>{reservation.peopleCount == null ? 'Not provided' : `${reservation.peopleCount} people`}</strong>
      </div>

      <dl className="family-grid">
        {detailItems.map(({ key, label, icon: Icon }) => (
          <div key={key}>
            <Icon size={17} aria-hidden="true" />
            <dt>{label}</dt>
            <dd>{displayValue(family[key])}</dd>
          </div>
        ))}
      </dl>

      <dl className="reservation-meta">
        <div>
          <Building2 size={18} aria-hidden="true" />
          <div><dt>Assigned shelter</dt><dd>{displayValue(reservation.shelterName)}</dd></div>
        </div>
        {expiresAt && (
          <div>
            <Clock3 size={18} aria-hidden="true" />
            <div><dt>Reservation expires</dt><dd>{expiresAt}</dd></div>
          </div>
        )}
      </dl>

      <div className={`mobility-note ${mobilityAssistance === true ? 'needed' : ''}`}>
        <Accessibility size={18} aria-hidden="true" />{mobilityMessage}
      </div>
    </section>
  )
}
