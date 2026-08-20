import { CheckCircle2, Info, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { RESERVATION_VERIFICATION_STATUS, confirmReservationArrival } from '../../services/operatorReservationService.js'

function getConfirmationFailureMessage(status) {
  const messages = {
    [RESERVATION_VERIFICATION_STATUS.INVALID_CODE]: 'Enter a valid evacuation code, for example ASH-5303.',
    [RESERVATION_VERIFICATION_STATUS.NOT_FOUND]: 'Reservation not found.',
    [RESERVATION_VERIFICATION_STATUS.EXPIRED]: 'This reservation has expired.',
    [RESERVATION_VERIFICATION_STATUS.ALREADY_ARRIVED]: 'Arrival has already been confirmed for this reservation.',
    [RESERVATION_VERIFICATION_STATUS.CANCELLED]: 'This reservation has been cancelled.',
    [RESERVATION_VERIFICATION_STATUS.WRONG_SHELTER]: 'This reservation is assigned to another shelter.',
    [RESERVATION_VERIFICATION_STATUS.INVALID_STATUS]: 'This reservation cannot be accepted in its current status.',
    [RESERVATION_VERIFICATION_STATUS.INVALID_RESERVATION]: 'This reservation is incomplete. Contact the response coordinator.',
    [RESERVATION_VERIFICATION_STATUS.SHELTER_NOT_FOUND]: 'The assigned shelter record was not found.',
    [RESERVATION_VERIFICATION_STATUS.CAPACITY_MISMATCH]: 'Shelter capacity records no longer match this reservation. Ask a coordinator to review capacity.',
    [RESERVATION_VERIFICATION_STATUS.SYSTEM_ERROR]: 'Unable to confirm arrival right now. Please try again.',
  }
  return messages[status] ?? messages[RESERVATION_VERIFICATION_STATUS.SYSTEM_ERROR]
}

export default function ArrivalConfirmation({ reservation, shelterId, onConfirmed }) {
  const [confirmationState, setConfirmationState] = useState({ type: 'idle', text: '' })
  const isConfirming = confirmationState.type === 'loading'
  const confirmed = confirmationState.type === 'success'

  async function handleConfirm() {
    if (isConfirming || confirmed) return
    setConfirmationState({ type: 'loading', text: 'Confirming arrival…' })
    try {
      const result = await confirmReservationArrival(reservation.code, { expectedShelterId: shelterId })
      if (!result.ok) {
        setConfirmationState({ type: 'error', text: getConfirmationFailureMessage(result.status) })
        return
      }
      setConfirmationState({ type: 'success', text: `Arrival confirmed for ${reservation.peopleCount} people. Shelter capacity has been updated.` })
      onConfirmed?.(result.reservation)
    } catch {
      setConfirmationState({ type: 'error', text: getConfirmationFailureMessage(RESERVATION_VERIFICATION_STATUS.SYSTEM_ERROR) })
    }
  }

  const messageTone = confirmationState.type === 'success' ? 'success' : confirmationState.type === 'error' ? 'error' : 'info'

  return (
    <section className="surface-card operator-card" aria-labelledby="arrival-heading">
      <div className="operator-card-heading">
        <div>
          <p className="operator-section-label">Final check</p>
          <h2 id="arrival-heading">Confirm arrival</h2>
          <p>{reservation.peopleCount == null
            ? 'Confirm only after every registered member of the group is present.'
            : `Confirm only after all ${reservation.peopleCount} members of the group are present.`}</p>
        </div>
      </div>

      <button className="button-primary arrival-button" type="button" onClick={handleConfirm} disabled={isConfirming || confirmed}>
        {isConfirming ? <LoaderCircle className="animate-spin" size={19} aria-hidden="true" /> : <CheckCircle2 size={19} aria-hidden="true" />}
        {isConfirming ? 'Confirming' : confirmed ? 'Arrival Confirmed' : 'Confirm Arrival'}
      </button>

      <div className={`operator-message ${messageTone}`} role={confirmationState.type === 'error' ? 'alert' : confirmationState.type === 'idle' ? undefined : 'status'}>
        {confirmationState.type === 'error'
          ? <TriangleAlert size={16} aria-hidden="true" />
          : confirmationState.type === 'success'
            ? <CheckCircle2 size={16} aria-hidden="true" />
            : <Info size={16} aria-hidden="true" />}
        {confirmationState.text || 'This deliberate action saves the arrival and updates live shelter capacity.'}
      </div>
    </section>
  )
}
