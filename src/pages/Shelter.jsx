import { LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import ArrivalConfirmation from '../components/shelter/ArrivalConfirmation.jsx'
import IncomingReservations from '../components/shelter/IncomingReservations.jsx'
import ReservationDetails from '../components/shelter/ReservationDetails.jsx'
import ReservationLookup from '../components/shelter/ReservationLookup.jsx'
import ShelterCapacityOverview from '../components/shelter/ShelterCapacityOverview.jsx'
import ShelterHeader from '../components/shelter/ShelterHeader.jsx'
import { getShelterById } from '../services/shelterService.js'

const operatorShelterId = 'S004'

function DashboardLoadState({ status, onRetry }) {
  const isLoading = status === 'loading'

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 text-slate-900">
      <section
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8"
        aria-live="polite"
        aria-busy={isLoading}
      >
        <span
          className={`mx-auto flex size-12 items-center justify-center rounded-xl ${
            isLoading
              ? 'bg-teal-50 text-teal-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {isLoading ? (
            <LoaderCircle className="animate-spin" size={24} aria-hidden="true" />
          ) : (
            <TriangleAlert size={24} aria-hidden="true" />
          )}
        </span>
        <h1 className="mt-4 text-xl font-bold text-slate-950">
          {isLoading ? 'Loading shelter dashboard' : 'Shelter dashboard unavailable'}
        </h1>
        <p className="mb-0 mt-2 text-sm leading-6 text-slate-600">
          {isLoading
            ? `Loading live capacity for shelter ${operatorShelterId}.`
            : 'We could not load this shelter from Firestore. Check the connection and try again.'}
        </p>
        {!isLoading && (
          <button
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-800 px-4 text-sm font-bold text-white transition-colors hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
            type="button"
            onClick={onRetry}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Try again
          </button>
        )}
      </section>
    </main>
  )
}

function Shelter() {
  const [verifiedReservation, setVerifiedReservation] = useState(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [dashboardState, setDashboardState] = useState({
    status: 'loading',
    shelter: null,
  })

  useEffect(() => {
    let isCurrent = true

    async function loadShelter() {
      setDashboardState({ status: 'loading', shelter: null })

      try {
        const liveShelter = await getShelterById(operatorShelterId)

        if (!isCurrent) {
          return
        }

        setDashboardState({
          status: liveShelter ? 'ready' : 'not-found',
          shelter: liveShelter,
        })
      } catch {
        if (isCurrent) {
          setDashboardState({ status: 'error', shelter: null })
        }
      }
    }

    loadShelter()

    return () => {
      isCurrent = false
    }
  }, [loadAttempt])

  if (dashboardState.status !== 'ready') {
    return (
      <DashboardLoadState
        status={dashboardState.status}
        onRetry={() => setLoadAttempt((attempt) => attempt + 1)}
      />
    )
  }

  const { shelter } = dashboardState
  const available = shelter.capacity - shelter.occupied - shelter.reserved

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <ShelterHeader shelter={shelter} />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <ShelterCapacityOverview shelter={shelter} available={available} />

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <IncomingReservations
            reservations={[]}
            unavailableMessage="The arrival queue is not available yet. Verify each arriving group with its evacuation code."
          />

          <div className="grid gap-6">
            <ReservationLookup
              shelterId={shelter.id}
              onVerified={setVerifiedReservation}
            />

            {verifiedReservation && (
              <div className="grid gap-6" aria-live="polite">
                <ReservationDetails reservation={verifiedReservation} />
                <ArrivalConfirmation
                  key={verifiedReservation.code}
                  reservation={verifiedReservation}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default Shelter
