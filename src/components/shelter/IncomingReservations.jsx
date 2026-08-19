import { Accessibility, Clock3, Info, LoaderCircle, Users } from 'lucide-react'

function IncomingReservations({
  reservations = [],
  isLoading = false,
  errorMessage = '',
  unavailableMessage = '',
}) {
  const totalPeople = reservations.reduce(
    (total, reservation) => total + reservation.peopleCount,
    0,
  )
  const hasReservations = reservations.length > 0

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="incoming-heading"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-teal-700">
            Arrival queue
          </p>
          <h2 id="incoming-heading" className="text-xl font-bold text-slate-950">
            Incoming reservations
          </h2>
          {!isLoading && !errorMessage && !unavailableMessage && (
            <p className="mb-0 mt-2 text-sm text-slate-500">
              {reservations.length} groups · {totalPeople} people expected
            </p>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-200">
          <Clock3 size={14} aria-hidden="true" />
          Active
        </span>
      </div>

      {isLoading && (
        <div
          className="mt-5 flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-4 text-sm font-semibold text-blue-800 ring-1 ring-inset ring-blue-200"
          role="status"
        >
          <LoaderCircle className="shrink-0 animate-spin" size={19} aria-hidden="true" />
          Loading incoming reservations…
        </div>
      )}

      {!isLoading && errorMessage && (
        <div
          className="mt-5 flex items-start gap-3 rounded-xl bg-red-50 px-4 py-4 text-sm font-semibold text-red-800 ring-1 ring-inset ring-red-200"
          role="alert"
        >
          <Info className="mt-0.5 shrink-0" size={19} aria-hidden="true" />
          {errorMessage}
        </div>
      )}

      {!isLoading && !errorMessage && unavailableMessage && (
        <div className="mt-5 flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-4 text-sm font-medium leading-6 text-amber-900 ring-1 ring-inset ring-amber-200">
          <Info className="mt-0.5 shrink-0" size={19} aria-hidden="true" />
          {unavailableMessage}
        </div>
      )}

      {!isLoading && !errorMessage && !unavailableMessage && !hasReservations && (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
          <p className="mb-0 text-sm font-semibold text-slate-700">
            No incoming reservations.
          </p>
        </div>
      )}

      {!isLoading && !errorMessage && !unavailableMessage && hasReservations && (
        <div className="mt-5 grid gap-3">
          {reservations.map((reservation) => {
            const family = reservation.family ?? {}

            return (
          <article
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"
            key={reservation.code}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Evacuation code
                </p>
                <h3 className="mb-0 font-mono text-lg font-bold tracking-wide text-slate-950">
                  {reservation.code}
                </h3>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-200">
                {reservation.status}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
                <Users size={17} className="text-teal-700" aria-hidden="true" />
                {reservation.peopleCount} people
              </span>
              <span>
                {family.adults} adults · {family.children} children ·{' '}
                {family.elderly} elderly
              </span>
            </div>

            {family.mobilityAssistance && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-violet-50 px-3 py-2.5 text-sm font-medium text-violet-900 ring-1 ring-inset ring-violet-200">
                <Accessibility size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                Mobility assistance required on arrival
              </div>
            )}
          </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default IncomingReservations
