import { FileQuestion, LoaderCircle, Search, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import {
  RESERVATION_VERIFICATION_STATUS,
  normalizeReservationCode,
  verifyReservationCode,
} from '../../services/operatorReservationService.js'

function getFailureState(status) {
  const states = {
    [RESERVATION_VERIFICATION_STATUS.INVALID_CODE]: { type: 'error', title: 'Invalid Code Format', text: 'Check the code and enter it in the format ASH-5303.' },
    [RESERVATION_VERIFICATION_STATUS.NOT_FOUND]: { type: 'not-found', title: 'Reservation Not Found', text: 'Check the code with the arriving family and try again.' },
    [RESERVATION_VERIFICATION_STATUS.EXPIRED]: { type: 'error', title: 'Reservation Expired', text: 'The spaces are no longer held. Ask the family to request another shelter.' },
    [RESERVATION_VERIFICATION_STATUS.ALREADY_ARRIVED]: { type: 'error', title: 'Arrival Already Confirmed', text: 'No further check-in action is needed for this reservation.' },
    [RESERVATION_VERIFICATION_STATUS.CANCELLED]: { type: 'error', title: 'Reservation Cancelled', text: 'This reservation cannot be checked in. Contact the response coordinator if assistance is needed.' },
    [RESERVATION_VERIFICATION_STATUS.WRONG_SHELTER]: { type: 'error', title: 'Another Shelter Assigned', text: 'The reservation belongs to another shelter. Check the assigned shelter with the family.' },
    [RESERVATION_VERIFICATION_STATUS.INVALID_STATUS]: { type: 'error', title: 'Reservation Not Ready', text: 'This reservation cannot be accepted in its current status. Contact the response coordinator.' },
    [RESERVATION_VERIFICATION_STATUS.INVALID_RESERVATION]: { type: 'error', title: 'Reservation Details Incomplete', text: 'Contact the response coordinator before checking in this group.' },
    [RESERVATION_VERIFICATION_STATUS.SYSTEM_ERROR]: { type: 'error', title: 'Verification Unavailable', text: 'The reservation could not be checked right now. Try again.' },
  }
  return states[status] ?? states[RESERVATION_VERIFICATION_STATUS.SYSTEM_ERROR]
}

export default function ReservationLookup({ shelterId, onVerified }) {
  const [code, setCode] = useState('')
  const [lookupState, setLookupState] = useState({ type: 'idle', text: '' })
  const isLoading = lookupState.type === 'loading'

  async function handleSubmit(event) {
    event.preventDefault()
    const normalizedCode = normalizeReservationCode(code)
    setCode(normalizedCode)
    onVerified(null)
    setLookupState({ type: 'loading', text: 'Checking reservation…' })

    try {
      const result = await verifyReservationCode(normalizedCode, { expectedShelterId: shelterId })
      if (!result.ok) {
        setLookupState(getFailureState(result.status))
        return
      }
      setLookupState({ type: 'success', title: 'Reservation Verified', text: 'Review the family details below, then confirm arrival.' })
      onVerified(result.reservation)
    } catch {
      setLookupState(getFailureState(RESERVATION_VERIFICATION_STATUS.SYSTEM_ERROR))
    }
  }

  function handleChange(event) {
    setCode(event.target.value)
    setLookupState({ type: 'idle', text: '' })
    onVerified(null)
  }

  const messageTone = lookupState.type === 'success'
    ? 'success'
    : lookupState.type === 'loading'
      ? 'info'
      : lookupState.type === 'not-found'
        ? 'warning'
        : 'error'

  return (
    <section className="surface-card operator-card" aria-labelledby="lookup-heading">
      <div className="operator-card-heading">
        <span className="operator-icon"><ShieldCheck size={21} aria-hidden="true" /></span>
        <div>
          <p className="operator-section-label">Guest check-in</p>
          <h2 id="lookup-heading">Verify evacuation code</h2>
          <p>Check the reservation before confirming the family’s arrival.</p>
        </div>
      </div>

      <form className="lookup-form" onSubmit={handleSubmit} noValidate aria-busy={isLoading}>
        <label className="field-label" htmlFor="evacuation-code">Evacuation code</label>
        <div className="field-row">
          <input
            className="text-input"
            id="evacuation-code"
            name="evacuation-code"
            type="text"
            value={code}
            onChange={handleChange}
            placeholder="ASH-5303"
            autoComplete="off"
            spellCheck="false"
            disabled={isLoading}
            aria-describedby={lookupState.type === 'idle' ? 'lookup-help' : 'lookup-message'}
            aria-invalid={lookupState.type === 'error' || lookupState.type === 'not-found'}
          />
          <button className="button-primary" type="submit" disabled={isLoading}>
            {isLoading ? <LoaderCircle className="animate-spin" size={17} aria-hidden="true" /> : <Search size={17} aria-hidden="true" />}
            {isLoading ? 'Checking' : 'Verify Reservation'}
          </button>
        </div>
        <p id="lookup-help" className="field-help">Codes are case-insensitive and will be formatted automatically.</p>

        {lookupState.type !== 'idle' && (
          <div id="lookup-message" className={`operator-message ${messageTone}`} role={lookupState.type === 'error' || lookupState.type === 'not-found' ? 'alert' : 'status'}>
            {lookupState.type === 'success' && <ShieldCheck size={18} aria-hidden="true" />}
            {lookupState.type === 'not-found' && <FileQuestion size={18} aria-hidden="true" />}
            {lookupState.type === 'loading' && <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />}
            {lookupState.type === 'error' && <TriangleAlert size={18} aria-hidden="true" />}
            <span>
              {lookupState.title && <strong>{lookupState.title}</strong>}
              {lookupState.text}
            </span>
          </div>
        )}
      </form>
    </section>
  )
}
