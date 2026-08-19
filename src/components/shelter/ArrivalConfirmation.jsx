import { CheckCircle2, Info, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import {
  RESERVATION_VERIFICATION_STATUS,
  confirmReservationArrival,
} from '../../services/operatorReservationService.js'

function getConfirmationFailureMessage(status) {
  const messages = {
    [RESERVATION_VERIFICATION_STATUS.INVALID_CODE]:
      'Enter a valid evacuation code, for example ASH-5303.',
    [RESERVATION_VERIFICATION_STATUS.NOT_FOUND]: 'Reservation not found.',
    [RESERVATION_VERIFICATION_STATUS.EXPIRED]: 'This reservation has expired.',
    [RESERVATION_VERIFICATION_STATUS.ALREADY_ARRIVED]:
      'Arrival has already been confirmed for this reservation.',
    [RESERVATION_VERIFICATION_STATUS.CANCELLED]:
      'This reservation has been cancelled.',
    [RESERVATION_VERIFICATION_STATUS.WRONG_SHELTER]:
      'This reservation is assigned to another shelter.',
    [RESERVATION_VERIFICATION_STATUS.INVALID_STATUS]:
      'This reservation cannot be accepted in its current status.',
    [RESERVATION_VERIFICATION_STATUS.INVALID_RESERVATION]:
      'This reservation is incomplete. Contact the response coordinator.',
    [RESERVATION_VERIFICATION_STATUS.SHELTER_NOT_FOUND]:
      'The assigned shelter record was not found.',
    [RESERVATION_VERIFICATION_STATUS.CAPACITY_MISMATCH]:
      'Shelter capacity records no longer match this reservation. Ask a coordinator to review capacity.',
    [RESERVATION_VERIFICATION_STATUS.SYSTEM_ERROR]:
      'Unable to confirm arrival right now. Please try again.',
  }

  return messages[status] ?? messages[RESERVATION_VERIFICATION_STATUS.SYSTEM_ERROR]
}

function ArrivalConfirmation({ reservation, shelterId, onConfirmed }) {
  const [confirmationState, setConfirmationState] = useState({
    type: 'idle',
    text: '',
  })
  const isConfirming = confirmationState.type === 'loading'
  const confirmed = confirmationState.type === 'success'

  async function handleConfirm() {
    if (isConfirming || confirmed) {
      return
    }

    setConfirmationState({
      type: 'loading',
      text: 'Confirming arrival…',
    })

    try {
      const result = await confirmReservationArrival(reservation.code, {
        expectedShelterId: shelterId,
      })

      if (!result.ok) {
        setConfirmationState({
          type: 'error',
          text: getConfirmationFailureMessage(result.status),
        })
        return
      }

      setConfirmationState({
        type: 'success',
        text: 'Arrival confirmed. Shelter capacity has been updated.',
      })
      onConfirmed?.(result.reservation)
    } catch {
      setConfirmationState({
        type: 'error',
        text: getConfirmationFailureMessage(
          RESERVATION_VERIFICATION_STATUS.SYSTEM_ERROR,
        ),
      })
    }
  }

  const messageTone =
    confirmationState.type === 'success'
      ? 'text-emerald-700'
      : confirmationState.type === 'error'
        ? 'text-red-700'
        : 'text-slate-500'

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="arrival-heading"
    >
      <h2 id="arrival-heading" className="text-lg font-bold text-slate-950">
        Arrival confirmation
      </h2>
      <p className="mb-0 mt-2 text-sm leading-6 text-slate-500">
        {reservation.peopleCount == null
          ? 'Confirm only after every registered member of the group is present.'
          : `Confirm only after all ${reservation.peopleCount} members of the group are present.`}
      </p>

      <button
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-default disabled:bg-emerald-800"
        type="button"
        onClick={handleConfirm}
        disabled={isConfirming || confirmed}
      >
        {isConfirming ? (
          <LoaderCircle className="animate-spin" size={19} aria-hidden="true" />
        ) : (
          <CheckCircle2 size={19} aria-hidden="true" />
        )}
        {isConfirming
          ? 'Confirming'
          : confirmed
            ? 'Arrival Confirmed'
            : 'Confirm Arrival'}
      </button>

      <div
        className={`mt-3 flex items-start gap-2 text-xs leading-5 ${messageTone}`}
        role={
          confirmationState.type === 'error'
            ? 'alert'
            : confirmationState.type === 'success' ||
                confirmationState.type === 'loading'
              ? 'status'
              : undefined
        }
      >
        {confirmationState.type === 'error' ? (
          <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
        ) : (
          <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
        )}
        {confirmationState.text ||
          'This will save the arrival and update shelter capacity.'}
      </div>
    </section>
  )
}

export default ArrivalConfirmation
