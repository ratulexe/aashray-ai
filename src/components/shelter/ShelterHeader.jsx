import { ArrowLeft, Building2, MapPin, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

function ShelterHeader({ shelter }) {
  const intakeActive = shelter.status === 'AVAILABLE'

  return (
    <header className="border-b border-teal-900/20 bg-teal-950 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav
          className="flex min-h-16 items-center justify-between gap-4 border-b border-white/10 py-3"
          aria-label="Shelter navigation"
        >
          <Link
            className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-teal-50 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            to="/"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Back to Aashray AI
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-50 ring-1 ring-inset ring-white/15 sm:text-sm">
            <ShieldCheck size={16} aria-hidden="true" />
            Shelter Operator
          </span>
        </nav>

        <div className="grid gap-5 py-7 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:py-9">
          <span className="flex size-12 items-center justify-center rounded-xl bg-teal-400/15 text-teal-200 ring-1 ring-inset ring-teal-300/20 sm:size-14">
            <Building2 size={28} aria-hidden="true" />
          </span>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-200">
              Shelter {shelter.id}
            </p>
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {shelter.name}
            </h1>
            <p className="mb-0 flex items-center gap-2 text-sm text-teal-100 sm:text-base">
              <MapPin size={17} aria-hidden="true" />
              {shelter.location}
            </p>
          </div>
          <div
            className={`flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ring-1 ring-inset ${
              intakeActive
                ? 'bg-emerald-400/10 text-emerald-200 ring-emerald-300/20'
                : 'bg-amber-400/10 text-amber-100 ring-amber-300/20'
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                intakeActive ? 'bg-emerald-300' : 'bg-amber-300'
              }`}
              aria-hidden="true"
            />
            {intakeActive ? 'Intake active' : 'Intake unavailable'}
          </div>
        </div>
      </div>
    </header>
  )
}

export default ShelterHeader
