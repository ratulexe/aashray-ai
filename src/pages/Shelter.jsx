import { useState } from 'react'
import ArrivalConfirmation from '../components/shelter/ArrivalConfirmation.jsx'
import IncomingReservations from '../components/shelter/IncomingReservations.jsx'
import ReservationDetails from '../components/shelter/ReservationDetails.jsx'
import ReservationLookup from '../components/shelter/ReservationLookup.jsx'
import ShelterCapacityOverview from '../components/shelter/ShelterCapacityOverview.jsx'
import ShelterHeader from '../components/shelter/ShelterHeader.jsx'

const shelter = {
  id: 'S004',
  name: 'BDO Relief Centre',
  location: 'Diamond Harbour',
  capacity: 600,
  occupied: 270,
  reserved: 66,
}

const reservations = [
  {
    code: 'ASH-5303',
    people: 6,
    status: 'RESERVED',
    adults: 3,
    children: 1,
    elderly: 2,
    mobilityAssistance: true,
  },
  {
    code: 'ASH-4821',
    people: 4,
    status: 'RESERVED',
    adults: 2,
    children: 2,
    elderly: 0,
    mobilityAssistance: false,
  },
]

function Shelter() {
  const [verifiedReservation, setVerifiedReservation] = useState(null)
  const available = shelter.capacity - shelter.occupied - shelter.reserved

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <ShelterHeader shelter={shelter} />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <ShelterCapacityOverview shelter={shelter} available={available} />

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <IncomingReservations reservations={reservations} />

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
                  shelterId={shelter.id}
                  onConfirmed={setVerifiedReservation}
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
