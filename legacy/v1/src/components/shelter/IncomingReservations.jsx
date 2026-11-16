import { Clock3, Info, LoaderCircle, Search, Users } from 'lucide-react'

export default function IncomingReservations({
  reservations = [],
  isLoading = false,
  errorMessage = '',
  unavailableMessage = '',
  onVerifyReservation,
}) {
  const totalPeople = reservations.reduce((total, reservation) => total + reservation.peopleCount, 0)
  const hasReservations = reservations.length > 0

  return (
    <section className="surface-card operator-card incoming-card" aria-labelledby="incoming-heading">
      <div className="operator-card-heading">
        <div>
          <p className="operator-section-label">Arrival queue</p>
          <h2 id="incoming-heading">Incoming reservations</h2>
          {!isLoading && !errorMessage && !unavailableMessage && (
            <p>{reservations.length} groups · {totalPeople} people expected</p>
          )}
        </div>
        <span className="status-badge info"><Clock3 size={13} aria-hidden="true" />Active</span>
      </div>

      {isLoading && <div className="operator-message info" role="status"><LoaderCircle className="animate-spin" size={18} aria-hidden="true" />Loading incoming reservations…</div>}
      {!isLoading && errorMessage && <div className="operator-message error" role="alert"><Info size={18} aria-hidden="true" />{errorMessage}</div>}
      {!isLoading && !errorMessage && unavailableMessage && <div className="operator-message warning"><Info size={18} aria-hidden="true" />{unavailableMessage}</div>}
      {!isLoading && !errorMessage && !unavailableMessage && !hasReservations && <div className="empty-state">No incoming reservations.</div>}

      {!isLoading && !errorMessage && !unavailableMessage && hasReservations && (
        <div className="incident-list">
          {reservations.map((reservation) => {
            return (
              <article className="incident-item" key={reservation.code}>
                <span className="incident-item-icon"><Users size={19} aria-hidden="true" /></span>
                <div>
                  <h3>{reservation.code}</h3>
                  <p>
                    Family: {reservation.peopleCount}
                    {reservation.etaMinutes ? ` · ETA: ${reservation.etaMinutes} min` : ''}
                  </p>
                </div>
                <div className="queue-actions">
                  <span className="status-badge warning">{reservation.status}</span>
                  <button
                    type="button"
                    className="button-secondary queue-verify-button"
                    onClick={() => onVerifyReservation?.(reservation.code)}
                  >
                    <Search size={15} aria-hidden="true" />
                    Verify
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
