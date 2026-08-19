import { BedDouble, BookmarkCheck, House, Users } from 'lucide-react'

const capacityItems = [
  {
    key: 'capacity',
    label: 'Total capacity',
    icon: House,
    tone: 'bg-slate-100 text-slate-700',
  },
  {
    key: 'occupied',
    label: 'Occupied',
    icon: Users,
    tone: 'bg-blue-50 text-blue-700',
  },
  {
    key: 'reserved',
    label: 'Reserved',
    icon: BookmarkCheck,
    tone: 'bg-amber-50 text-amber-700',
  },
  {
    key: 'available',
    label: 'Available',
    icon: BedDouble,
    tone: 'bg-emerald-50 text-emerald-700',
  },
]

function ShelterCapacityOverview({ shelter, available }) {
  const values = { ...shelter, available }
  const occupiedPercent = (shelter.occupied / shelter.capacity) * 100
  const reservedPercent = (shelter.reserved / shelter.capacity) * 100
  const availablePercent = (available / shelter.capacity) * 100

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="capacity-heading"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-teal-700">
            Live intake snapshot
          </p>
          <h2 id="capacity-heading" className="text-xl font-bold text-slate-950">
            Capacity overview
          </h2>
        </div>
        <p className="mb-0 text-sm text-slate-500">
          {availablePercent.toFixed(0)}% of spaces currently available
        </p>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {capacityItems.map(({ key, label, icon: Icon, tone }) => (
          <div
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
            key={key}
          >
            <div className="flex items-center justify-between gap-3">
              <dt className="text-sm font-medium text-slate-600">{label}</dt>
              <span className={`flex size-9 items-center justify-center rounded-lg ${tone}`}>
                <Icon size={18} aria-hidden="true" />
              </span>
            </div>
            <dd className="mt-3 text-2xl font-bold tabular-nums text-slate-950">
              {values[key]}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5" aria-label="Capacity distribution">
        <div className="flex h-3 overflow-hidden rounded-full bg-slate-200">
          <span
            className="bg-blue-600"
            style={{ width: `${occupiedPercent}%` }}
            title={`${shelter.occupied} occupied`}
          />
          <span
            className="bg-amber-500"
            style={{ width: `${reservedPercent}%` }}
            title={`${shelter.reserved} reserved`}
          />
          <span
            className="bg-emerald-500"
            style={{ width: `${availablePercent}%` }}
            title={`${available} available`}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-blue-600" aria-hidden="true" />
            Occupied
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-amber-500" aria-hidden="true" />
            Reserved
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
            Available
          </span>
        </div>
      </div>
    </section>
  )
}

export default ShelterCapacityOverview
