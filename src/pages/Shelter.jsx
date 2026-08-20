import { LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AppHeader } from '../components/AppHeader.jsx'
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
    <main>
      <AppHeader />
      <div className="page-container citizen-page">
      <section className="surface-card operator-card empty-state" aria-live="polite" aria-busy={isLoading}>
        <span
          className={`mx-auto flex size-12 items-center justify-center rounded-xl ${
            isLoading
              ? 'bg-teal-300/10 text-teal-200 ring-1 ring-inset ring-teal-200/15'
              : 'bg-red-300/10 text-red-200 ring-1 ring-inset ring-red-200/15'
          }`}
        >
          {isLoading ? (
            <LoaderCircle className="animate-spin" size={24} aria-hidden="true" />
          ) : (
            <TriangleAlert size={24} aria-hidden="true" />
          )}
        </span>
        <h1 className="mt-4 text-xl font-bold">
          {isLoading ? 'Loading shelter dashboard' : 'Shelter dashboard unavailable'}
        </h1>
        <p className="mb-0 mt-2 text-sm leading-6 text-slate-500">
          {isLoading
            ? `Loading live capacity for shelter ${operatorShelterId}.`
            : 'We could not load this shelter from Firestore. Check the connection and try again.'}
        </p>
        {!isLoading && (
          <button
            className="button-primary mt-5"
            type="button"
            onClick={onRetry}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Try again
          </button>
        )}
      </section>
      </div>
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
    <main className="operator-page">
      <AppHeader />
      <ShelterHeader shelter={shelter} />

      <div className="page-container operator-content">
        <ShelterCapacityOverview shelter={shelter} available={available} />

        <div className="operator-grid">
          <div className="operator-stack">
            <ReservationLookup
              shelterId={shelter.id}
              onVerified={setVerifiedReservation}
            />

            {verifiedReservation && (
              <div className="operator-stack" aria-live="polite">
                <ReservationDetails reservation={verifiedReservation} />
                <ArrivalConfirmation
                  key={verifiedReservation.code}
                  reservation={verifiedReservation}
                  shelterId={shelter.id}
                  onConfirmed={setVerifiedReservation}
                />
              </div>
            )}
          </div>

          <IncomingReservations
            reservations={[]}
            unavailableMessage="The arrival queue is not available yet. Verify each arriving group with its evacuation code."
          />
        </div>
      </div>
    </main>
  )
}

export default Shelter
