import {
  Accessibility,
  Baby,
  Building2,
  Clock3,
  UserRound,
  Users,
} from 'lucide-react'

const detailItems = [
  { key: 'adults', label: 'Adults', icon: UserRound },
  { key: 'children', label: 'Children', icon: Baby },
  { key: 'elderly', label: 'Elderly', icon: Users },
]

function displayValue(value) {
  return value ?? 'Not provided'
}

function formatExpiresAt(value) {
  if (!value) {
    return null
  }

  let expirationDate = null

  if (value instanceof Date) {
    expirationDate = value
  } else if (typeof value?.toDate === 'function') {
    expirationDate = value.toDate()
  } else if (typeof value?.seconds === 'number') {
    expirationDate = new Date(value.seconds * 1000)
  } else if (typeof value === 'string' || typeof value === 'number') {
    expirationDate = new Date(value)
  }

  if (!expirationDate || Number.isNaN(expirationDate.getTime())) {
    return 'Expiration recorded'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(expirationDate)
}

function ReservationDetails({ reservation }) {
  const family = reservation.family ?? {}
  const expiresAt = formatExpiresAt(reservation.expiresAt)
  const mobilityAssistance = family.mobilityAssistance
  const mobilityTone =
    mobilityAssistance === true
      ? 'bg-violet-50 font-semibold text-violet-900 ring-violet-200'
      : 'bg-slate-50 text-slate-700 ring-slate-200'
  const mobilityMessage =
    mobilityAssistance === true
      ? 'Mobility assistance is required. Prepare an accessible intake route.'
      : mobilityAssistance === false
        ? 'No mobility assistance requested.'
        : 'Mobility assistance information was not provided.'

  return (
    <section
      className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="reservation-details-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
            Verified reservation
          </p>
          <h2
            id="reservation-details-heading"
            className="mb-0 font-mono text-xl font-bold tracking-wide text-slate-950"
          >
            {reservation.code}
          </h2>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-200">
          {displayValue(reservation.status)}
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-xl bg-teal-950 px-4 py-4 text-white">
        <span className="text-sm font-medium text-teal-100">Group size</span>
        <strong className="text-right text-xl font-bold tabular-nums sm:text-2xl">
          {reservation.peopleCount == null
            ? 'Not provided'
            : `${reservation.peopleCount} people`}
        </strong>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2">
        {detailItems.map(({ key, label, icon: Icon }) => (
          <div className="rounded-lg border border-slate-200 p-3 text-center" key={key}>
            <Icon className="mx-auto text-slate-500" size={18} aria-hidden="true" />
            <dt className="mt-2 text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-1 text-base font-bold text-slate-950 sm:text-lg">
              {displayValue(family[key])}
            </dd>
          </div>
        ))}
      </dl>

      <dl className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-4 text-sm">
        <div className="flex items-start gap-3">
          <Building2
            className="mt-0.5 shrink-0 text-teal-700"
            size={18}
            aria-hidden="true"
          />
          <div>
            <dt className="font-medium text-slate-500">Assigned shelter</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">
              {displayValue(reservation.shelterName)}
            </dd>
          </div>
        </div>
        {expiresAt && (
          <div className="flex items-start gap-3">
            <Clock3
              className="mt-0.5 shrink-0 text-teal-700"
              size={18}
              aria-hidden="true"
            />
            <div>
              <dt className="font-medium text-slate-500">Reservation expires</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{expiresAt}</dd>
            </div>
          </div>
        )}
      </dl>

      <div
        className={`mt-4 flex items-start gap-3 rounded-lg px-3.5 py-3 text-sm ring-1 ring-inset ${mobilityTone}`}
      >
        <Accessibility size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
        {mobilityMessage}
      </div>
    </section>
  )
}

export default ReservationDetails
