import {
  FileQuestion,
  LoaderCircle,
  Search,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { useState } from 'react'
import {
  RESERVATION_VERIFICATION_STATUS,
  normalizeReservationCode,
  verifyReservationCode,
} from '../../services/operatorReservationService.js'

function getFailureState(status) {
  const states = {
    [RESERVATION_VERIFICATION_STATUS.INVALID_CODE]: {
      type: 'error',
      text: 'Enter a valid evacuation code, for example ASH-5303.',
    },
    [RESERVATION_VERIFICATION_STATUS.NOT_FOUND]: {
      type: 'not-found',
      text: 'Reservation not found.',
    },
    [RESERVATION_VERIFICATION_STATUS.EXPIRED]: {
      type: 'error',
      text: 'This reservation has expired.',
    },
    [RESERVATION_VERIFICATION_STATUS.ALREADY_ARRIVED]: {
      type: 'error',
      text: 'Arrival has already been confirmed for this reservation.',
    },
    [RESERVATION_VERIFICATION_STATUS.CANCELLED]: {
      type: 'error',
      text: 'This reservation has been cancelled.',
    },
    [RESERVATION_VERIFICATION_STATUS.WRONG_SHELTER]: {
      type: 'error',
      text: 'This reservation is assigned to another shelter.',
    },
    [RESERVATION_VERIFICATION_STATUS.INVALID_STATUS]: {
      type: 'error',
      text: 'This reservation cannot be accepted in its current status.',
    },
    [RESERVATION_VERIFICATION_STATUS.INVALID_RESERVATION]: {
      type: 'error',
      text: 'This reservation is incomplete. Contact the response coordinator.',
    },
    [RESERVATION_VERIFICATION_STATUS.SYSTEM_ERROR]: {
      type: 'error',
      text: 'Unable to verify this reservation right now. Please try again.',
    },
  }

  return states[status] ?? states[RESERVATION_VERIFICATION_STATUS.SYSTEM_ERROR]
}

function ReservationLookup({ shelterId, onVerified }) {
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
      const result = await verifyReservationCode(normalizedCode, {
        expectedShelterId: shelterId,
      })

      if (!result.ok) {
        setLookupState(getFailureState(result.status))
        return
      }

      setLookupState({
        type: 'success',
        text: 'Reservation verified successfully.',
      })
      onVerified(result.reservation)
    } catch {
      setLookupState(
        getFailureState(RESERVATION_VERIFICATION_STATUS.SYSTEM_ERROR),
      )
    }
  }

  function handleChange(event) {
    setCode(event.target.value)
    setLookupState({ type: 'idle', text: '' })
    onVerified(null)
  }

  const messageTone =
    lookupState.type === 'success'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
      : lookupState.type === 'not-found'
        ? 'bg-amber-50 text-amber-900 ring-amber-200'
        : lookupState.type === 'loading'
          ? 'bg-blue-50 text-blue-800 ring-blue-200'
          : 'bg-red-50 text-red-800 ring-red-200'

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="lookup-heading"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <ShieldCheck size={21} aria-hidden="true" />
        </span>
        <div>
          <h2 id="lookup-heading" className="text-lg font-bold text-slate-950">
            Verify evacuation code
          </h2>
          <p className="mb-0 mt-1 text-sm leading-6 text-slate-500">
            Check a guest reservation before confirming their arrival.
          </p>
        </div>
      </div>

      <form
        className="mt-5"
        onSubmit={handleSubmit}
        noValidate
        aria-busy={isLoading}
      >
        <label
          className="mb-2 block text-sm font-semibold text-slate-800"
          htmlFor="evacuation-code"
        >
          Evacuation code
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 font-mono text-base uppercase tracking-wide text-slate-950 outline-none transition-colors placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-teal-700 focus:ring-3 focus:ring-teal-700/15 disabled:cursor-wait disabled:bg-slate-50"
            id="evacuation-code"
            name="evacuation-code"
            type="text"
            value={code}
            onChange={handleChange}
            placeholder="Enter code, e.g. ASH-5303"
            autoComplete="off"
            spellCheck="false"
            disabled={isLoading}
            aria-describedby={
              lookupState.type === 'idle' ? 'lookup-help' : 'lookup-message'
            }
            aria-invalid={lookupState.type === 'error'}
          />
          <button
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-teal-800 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:cursor-wait disabled:bg-teal-700"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
            ) : (
              <Search size={17} aria-hidden="true" />
            )}
            {isLoading ? 'Checking' : 'Verify'}
          </button>
        </div>
        <p id="lookup-help" className="mb-0 mt-2 text-xs text-slate-500">
          Codes are case-insensitive.
        </p>

        {lookupState.type !== 'idle' && (
          <div
            id="lookup-message"
            className={`mt-4 flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold ring-1 ring-inset ${messageTone}`}
            role={lookupState.type === 'error' ? 'alert' : 'status'}
          >
            {lookupState.type === 'success' && (
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
            )}
            {lookupState.type === 'not-found' && (
              <FileQuestion
                size={18}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
            )}
            {lookupState.type === 'loading' && (
              <LoaderCircle
                size={18}
                className="mt-0.5 shrink-0 animate-spin"
                aria-hidden="true"
              />
            )}
            {lookupState.type === 'error' && (
              <TriangleAlert
                size={18}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
            )}
            {lookupState.text}
          </div>
        )}
      </form>
    </section>
  )
}

export default ReservationLookup
