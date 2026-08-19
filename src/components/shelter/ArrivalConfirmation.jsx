import { CheckCircle2, Info } from 'lucide-react'
import { useState } from 'react'

function ArrivalConfirmation({ reservation }) {
  const [confirmed, setConfirmed] = useState(false)

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
        onClick={() => setConfirmed(true)}
        disabled={confirmed}
      >
        <CheckCircle2 size={19} aria-hidden="true" />
        {confirmed ? 'Arrival confirmed in mock view' : 'Confirm Arrival'}
      </button>

      <div
        className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500"
        role={confirmed ? 'status' : undefined}
      >
        <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
        {confirmed
          ? 'This preview did not update capacity or save any records.'
          : 'UI preview only. No database transaction will be performed.'}
      </div>
    </section>
  )
}

export default ArrivalConfirmation
