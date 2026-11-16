import { Building2, Check, ChevronDown, ClipboardCheck, LoaderCircle, MapPin, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppHeader } from '../components/AppHeader.jsx'
import ArrivalConfirmation from '../components/shelter/ArrivalConfirmation.jsx'
import IncomingReservations from '../components/shelter/IncomingReservations.jsx'
import ReservationDetails from '../components/shelter/ReservationDetails.jsx'
import ReservationLookup from '../components/shelter/ReservationLookup.jsx'
import ShelterCapacityOverview from '../components/shelter/ShelterCapacityOverview.jsx'
import ShelterHeader from '../components/shelter/ShelterHeader.jsx'
import { subscribeToIncomingReservations } from '../services/operatorReservationService.js'
import { subscribeToShelters } from '../services/shelterService.js'

const defaultSelectedShelterId = 'S004'

function DashboardLoadState({ status, selectedShelterId, onRetry }) {
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
            ? 'Loading live shelter capacity and operator tools.'
            : status === 'not-found'
              ? `Shelter ${selectedShelterId} was not found in Firestore.`
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

function ShelterSelector({ shelters, selectedShelterId, onSelectShelter }) {
  const [isOpen, setIsOpen] = useState(false)
  const selectorRef = useRef(null)
  const selectedShelter = shelters.find((shelter) => shelter.id === selectedShelterId) ?? shelters[0]

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!selectorRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function handleSelectShelter(shelterId) {
    onSelectShelter(shelterId)
    setIsOpen(false)
  }

  return (
    <section className="surface-card operator-card shelter-selector-card" aria-labelledby="shelter-selector-heading">
      <div className="operator-card-heading">
        <div>
          <p className="operator-section-label">Prototype Shelter Selector</p>
          <h2 id="shelter-selector-heading">Current shelter</h2>
          <p>Switch the operator dashboard to another prototype shelter.</p>
        </div>
      </div>

      <label className="field-label" htmlFor="operator-shelter-select">
        Shelter
      </label>

      <div className="shelter-picker" ref={selectorRef}>
        <button
          id="operator-shelter-select"
          type="button"
          className="shelter-picker-trigger"
          onClick={() => setIsOpen((current) => !current)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls="operator-shelter-options"
        >
          <span className="shelter-picker-icon"><Building2 size={20} aria-hidden="true" /></span>
          <span className="shelter-picker-current">
            <strong>{selectedShelter?.id} - {selectedShelter?.name}</strong>
            <span><MapPin size={14} aria-hidden="true" />{selectedShelter?.location}</span>
          </span>
          <ChevronDown className={isOpen ? 'rotate-180' : ''} size={20} aria-hidden="true" />
        </button>

        {isOpen && (
          <div
            id="operator-shelter-options"
            className="shelter-picker-menu"
            role="listbox"
            aria-labelledby="operator-shelter-select"
          >
            {shelters.map((shelter) => {
              const isSelected = shelter.id === selectedShelterId

              return (
                <button
                  type="button"
                  key={shelter.id}
                  className={`shelter-picker-option ${isSelected ? 'selected' : ''}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectShelter(shelter.id)}
                >
                  <span className="shelter-picker-option-main">
                    <strong>{shelter.id} - {shelter.name}</strong>
                    <span><MapPin size={13} aria-hidden="true" />{shelter.location}</span>
                  </span>
                  {isSelected && <Check size={18} aria-hidden="true" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function ActiveIntakePanel({ shelter, available, reservations }) {
  return (
    <section className="surface-card operator-card operator-side-panel" aria-labelledby="active-intake-heading">
      <div className="operator-card-heading">
        <div>
          <p className="operator-section-label">Operator readiness</p>
          <h2 id="active-intake-heading">{shelter.name}</h2>
          <p>{reservations.length} valid reserved groups are waiting for this shelter.</p>
        </div>
        <span className="status-badge info">{available} spaces</span>
      </div>

      <dl className="side-panel-stats">
        <div>
          <dt>Available</dt>
          <dd>{available}</dd>
        </div>
        <div>
          <dt>Reserved</dt>
          <dd>{shelter.reserved}</dd>
        </div>
        <div>
          <dt>Queue</dt>
          <dd>{reservations.length}</dd>
        </div>
      </dl>

      <div className="operator-checklist" aria-label="Operator workflow">
        <div className="done"><ShieldCheck size={16} aria-hidden="true" />Select the active shelter</div>
        <div><ClipboardCheck size={16} aria-hidden="true" />Verify the arriving ASH code</div>
        <div><Building2 size={16} aria-hidden="true" />Confirm arrival after the group is present</div>
      </div>
    </section>
  )
}

function NoActiveCheckInPanel({ shelter, reservations }) {
  return (
    <section className="surface-card operator-card no-checkin-panel" aria-labelledby="no-checkin-heading">
      <div className="operator-card-heading lookup-card-heading">
        <span className="operator-icon"><ClipboardCheck size={21} aria-hidden="true" /></span>
        <div>
          <p className="operator-section-label">No active check-in</p>
          <h2 id="no-checkin-heading">Awaiting reservation verification</h2>
          <p>Enter an ASH code above or verify a group from the arrival queue.</p>
        </div>
      </div>

      <div className="no-checkin-body">
        <div>
          <strong>{shelter.id}</strong>
          <span>Current operator shelter</span>
        </div>
        <div>
          <strong>{reservations.length}</strong>
          <span>Valid incoming reservations</span>
        </div>
      </div>

      <div className="operator-checklist" aria-label="Check-in workflow">
        <div className="current"><ShieldCheck size={16} aria-hidden="true" />Verify the evacuation code</div>
        <div><ClipboardCheck size={16} aria-hidden="true" />Review the family details</div>
        <div><Building2 size={16} aria-hidden="true" />Confirm arrival when present</div>
      </div>
    </section>
  )
}

function Shelter() {
  const [selectedShelterId, setSelectedShelterId] = useState(defaultSelectedShelterId)
  const [verifiedReservation, setVerifiedReservation] = useState(null)
  const [verificationRequest, setVerificationRequest] = useState(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [dashboardState, setDashboardState] = useState({
    status: 'loading',
    shelters: [],
  })
  const [incomingState, setIncomingState] = useState({
    status: 'loading',
    reservations: [],
    errorMessage: '',
  })

  useEffect(() => {
    return subscribeToShelters(
      (shelters) => {
        setDashboardState({
          status: shelters.length > 0 ? 'ready' : 'not-found',
          shelters,
        })

        setSelectedShelterId((currentShelterId) => {
          if (shelters.some((shelter) => shelter.id === currentShelterId)) {
            return currentShelterId
          }

          return shelters[0]?.id ?? currentShelterId
        })
      },
      () => {
        setDashboardState({ status: 'error', shelters: [] })
      },
    )
  }, [loadAttempt])

  const shelter = useMemo(
    () => dashboardState.shelters.find((candidate) => candidate.id === selectedShelterId) ?? null,
    [dashboardState.shelters, selectedShelterId],
  )

  useEffect(() => {
    if (!selectedShelterId || dashboardState.status !== 'ready') {
      return undefined
    }

    return subscribeToIncomingReservations(
      selectedShelterId,
      (reservations) => {
        setIncomingState({
          status: 'ready',
          reservations,
          errorMessage: '',
        })
      },
      () => {
        setIncomingState({
          status: 'error',
          reservations: [],
          errorMessage: 'Incoming reservations could not be loaded. Try again.',
        })
      },
    )
  }, [dashboardState.status, selectedShelterId])

  const handleSelectShelter = useCallback((shelterId) => {
    setSelectedShelterId(shelterId)
    setVerifiedReservation(null)
    setVerificationRequest(null)
    setIncomingState({ status: 'loading', reservations: [], errorMessage: '' })
  }, [])

  const handleVerifyQueuedReservation = useCallback((code) => {
    setVerifiedReservation(null)
    setVerificationRequest({
      code,
      requestId: Date.now(),
    })
  }, [])

  const handleConfirmedArrival = useCallback((reservation) => {
    setVerifiedReservation(reservation)
  }, [])

  if (dashboardState.status !== 'ready' || !shelter) {
    return (
      <DashboardLoadState
        status={dashboardState.status === 'ready' ? 'not-found' : dashboardState.status}
        selectedShelterId={selectedShelterId}
        onRetry={() => {
          setDashboardState({ status: 'loading', shelters: [] })
          setIncomingState({ status: 'loading', reservations: [], errorMessage: '' })
          setLoadAttempt((attempt) => attempt + 1)
        }}
      />
    )
  }

  const available = shelter.capacity - shelter.occupied - shelter.reserved

  return (
    <main className="operator-page">
      <AppHeader />
      <ShelterHeader shelter={shelter} />

      <div className="page-container operator-content">
        <ShelterSelector
          shelters={dashboardState.shelters}
          selectedShelterId={selectedShelterId}
          onSelectShelter={handleSelectShelter}
        />

        <ShelterCapacityOverview shelter={shelter} available={available} />

        <div className="operator-grid">
          <div className="operator-grid-row">
            <ReservationLookup
              shelterId={shelter.id}
              shelterName={shelter.name}
              verificationRequest={verificationRequest}
              onVerified={setVerifiedReservation}
              onSwitchToAssignedShelter={handleSelectShelter}
            />

            <IncomingReservations
              reservations={incomingState.reservations}
              isLoading={incomingState.status === 'loading'}
              errorMessage={incomingState.errorMessage}
              onVerifyReservation={handleVerifyQueuedReservation}
            />
          </div>

          <div className="operator-grid-row operator-workflow-row">
            {verifiedReservation && (
              <>
                <ReservationDetails reservation={verifiedReservation} />
                <ArrivalConfirmation
                  key={verifiedReservation.code}
                  reservation={verifiedReservation}
                  shelterId={shelter.id}
                  onConfirmed={handleConfirmedArrival}
                />
              </>
            )}

            {!verifiedReservation && (
              <>
                <NoActiveCheckInPanel
                  shelter={shelter}
                  reservations={incomingState.reservations}
                />
                <ActiveIntakePanel
                  shelter={shelter}
                  available={available}
                  reservations={incomingState.reservations}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default Shelter
