import { FileQuestion, LoaderCircle, Search, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
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

function WrongShelterDetails({
  code,
  reservation,
  currentShelterName,
  onSwitchToAssignedShelter,
}) {
  const assignedShelterName = reservation?.shelterName || 'Assigned shelter'
  const assignedShelterId = reservation?.shelterId
  const canSwitch = Boolean(assignedShelterId && onSwitchToAssignedShelter)

  return (
    <div className="wrong-shelter-details">
      <p>
        <strong>{code}</strong> is reserved at:
      </p>
      <p className="wrong-shelter-name">
        {assignedShelterName}
        {assignedShelterId && <span>{assignedShelterId}</span>}
      </p>
      <p>
        Current operator shelter:
      </p>
      <p className="wrong-shelter-name">{currentShelterName || 'Selected shelter'}</p>

      {canSwitch && (
        <button
          type="button"
          className="button-secondary wrong-shelter-switch"
          onClick={() => onSwitchToAssignedShelter(assignedShelterId)}
        >
          Switch to Assigned Shelter
        </button>
      )}
    </div>
  )
}

export default function ReservationLookup({
  shelterId,
  shelterName,
  verificationRequest,
  onVerified,
  onSwitchToAssignedShelter,
}) {
  const [code, setCode] = useState('')
  const [lookupState, setLookupState] = useState({ type: 'idle', text: '' })
  const activeLookupState = lookupState.shelterId === shelterId
    ? lookupState
    : { type: 'idle', text: '' }
  const isLoading = activeLookupState.type === 'loading'

  const runLookup = useCallback(async (rawCode) => {
    const normalizedCode = normalizeReservationCode(rawCode)
    setCode(normalizedCode)
    onVerified(null)
    setLookupState({ type: 'loading', text: 'Checking reservation…', shelterId })

    try {
      const result = await verifyReservationCode(normalizedCode, { expectedShelterId: shelterId })
      if (!result.ok) {
        setLookupState({
          ...getFailureState(result.status),
          code: result.code,
          reservation: result.reservation ?? null,
          shelterId,
        })
        return
      }
      setLookupState({ type: 'success', title: 'Reservation Verified', text: 'Review the family details below, then confirm arrival.', shelterId })
      onVerified(result.reservation)
    } catch {
      setLookupState({
        ...getFailureState(RESERVATION_VERIFICATION_STATUS.SYSTEM_ERROR),
        shelterId,
      })
    }
  }, [onVerified, shelterId])

  async function handleSubmit(event) {
    event.preventDefault()
    await runLookup(code)
  }

  function handleChange(event) {
    setCode(event.target.value)
    setLookupState({ type: 'idle', text: '' })
    onVerified(null)
  }

  useEffect(() => {
    if (!verificationRequest?.code) {
      return undefined
    }

    const lookupTimer = setTimeout(() => {
      runLookup(verificationRequest.code)
    }, 0)

    return () => clearTimeout(lookupTimer)
  }, [runLookup, verificationRequest])

  const messageTone = activeLookupState.type === 'success'
    ? 'success'
    : activeLookupState.type === 'loading'
      ? 'info'
      : activeLookupState.type === 'not-found'
        ? 'warning'
        : 'error'

  return (
    <section className="surface-card operator-card lookup-card" aria-labelledby="lookup-heading">
      <div className="operator-card-heading lookup-card-heading">
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
            aria-describedby={activeLookupState.type === 'idle' ? 'lookup-help' : 'lookup-message'}
            aria-invalid={activeLookupState.type === 'error' || activeLookupState.type === 'not-found'}
          />
          <button className="button-primary" type="submit" disabled={isLoading}>
            {isLoading ? <LoaderCircle className="animate-spin" size={17} aria-hidden="true" /> : <Search size={17} aria-hidden="true" />}
            {isLoading ? 'Checking' : 'Verify Reservation'}
          </button>
        </div>
        <p id="lookup-help" className="field-help">Codes are case-insensitive and will be formatted automatically.</p>

        {activeLookupState.type !== 'idle' && (
          <div id="lookup-message" className={`operator-message ${messageTone}`} role={activeLookupState.type === 'error' || activeLookupState.type === 'not-found' ? 'alert' : 'status'}>
            {activeLookupState.type === 'success' && <ShieldCheck size={18} aria-hidden="true" />}
            {activeLookupState.type === 'not-found' && <FileQuestion size={18} aria-hidden="true" />}
            {activeLookupState.type === 'loading' && <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />}
            {activeLookupState.type === 'error' && <TriangleAlert size={18} aria-hidden="true" />}
            <span>
              {activeLookupState.title && <strong>{activeLookupState.title}</strong>}
              {activeLookupState.text}
              {activeLookupState.type === 'error' &&
                activeLookupState.reservation &&
                activeLookupState.reservation.shelterId &&
                activeLookupState.reservation.shelterId !== shelterId && (
                  <WrongShelterDetails
                    code={activeLookupState.code}
                    reservation={activeLookupState.reservation}
                    currentShelterName={shelterName}
                    onSwitchToAssignedShelter={onSwitchToAssignedShelter}
                  />
                )}
            </span>
          </div>
        )}
      </form>
    </section>
  )
}
