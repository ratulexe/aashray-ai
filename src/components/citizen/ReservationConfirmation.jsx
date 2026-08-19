import {
  CheckCircle2,
  Clock3,
  House,
  MapPin,
  ShieldCheck,
  TicketCheck,
  Users,
} from "lucide-react";

import MockSmsNotification from "./MockSmsNotification";

function formatReservationTime(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function ReservationConfirmation({
  reservation,
  shelter,
  familyDetails,
}) {
  const distanceKm = reservation.distanceKm ?? shelter.distanceKm;
  const distanceLabel = Number.isFinite(distanceKm)
    ? `${distanceKm.toFixed(1)} km`
    : "Not available";

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-teal-50 p-6 sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-teal-700">
            <CheckCircle2 size={30} aria-hidden="true" />
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-teal-700">
            Reservation Confirmed
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {reservation.shelterName}
          </h2>

          <p className="mt-3 flex items-center gap-2 leading-7 text-slate-700">
            <MapPin size={19} className="shrink-0" aria-hidden="true" />
            {reservation.shelterLocation}
          </p>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <div className="rounded-3xl border border-teal-200 bg-teal-50 p-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-teal-700">
              <TicketCheck size={25} aria-hidden="true" />
            </div>

            <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-teal-700">
              Evacuation Code
            </p>

            <p className="mt-2 text-4xl font-black tracking-normal text-slate-950 sm:text-5xl">
              {reservation.id}
            </p>

            <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
              Show this code at the shelter when you arrive.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-teal-700" aria-hidden="true" />
                <p className="text-sm text-slate-500">Spaces Reserved</p>
              </div>
              <p className="mt-3 text-xl font-bold text-slate-900">
                {reservation.peopleCount}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <House size={20} className="text-teal-700" aria-hidden="true" />
                <p className="text-sm text-slate-500">Distance</p>
              </div>
              <p className="mt-3 text-xl font-bold text-slate-900">
                {distanceLabel}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-teal-700" aria-hidden="true" />
                <p className="text-sm text-slate-500">Status</p>
              </div>
              <p className="mt-3 font-semibold text-slate-900">Reserved</p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <Clock3 size={20} className="text-teal-700" aria-hidden="true" />
                <p className="text-sm text-slate-500">Estimated Travel Time</p>
              </div>
              <p className="mt-3 font-semibold text-slate-900">
                {reservation.etaMinutes} min
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900">Reservation Validity</h3>

            <div className="mt-4 grid gap-3">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <span className="text-sm font-medium text-slate-600">
                  Arrival safety buffer
                </span>
                <span className="font-bold tabular-nums text-slate-900">
                  {reservation.bufferMinutes} min
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <span className="text-sm font-medium text-slate-600">
                  Reservation held for
                </span>
                <span className="font-bold tabular-nums text-slate-900">
                  {reservation.validityMinutes} min
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-slate-600">
                  Reservation valid until
                </span>
                <span className="font-bold tabular-nums text-slate-900">
                  {formatReservationTime(reservation.expiresAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900">Shelter Capacity</h3>

            <div className="mt-4 grid gap-3">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <span className="text-sm font-medium text-slate-600">
                  Before reservation
                </span>
                <span className="font-bold tabular-nums text-slate-900">
                  {reservation.availableBefore} spaces available
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-slate-600">
                  After your reservation
                </span>
                <span className="font-bold tabular-nums text-slate-900">
                  {reservation.availableAfter} spaces available
                </span>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Occupied capacity is unchanged until arrival is verified at the
              shelter.
            </p>
          </div>

          <p className="text-center text-sm leading-6 text-slate-500">
            Keep this code available. The shelter operator will verify it when
            you arrive.
          </p>
        </div>
      </section>

      <MockSmsNotification
        phone={reservation.phone}
        reservation={reservation}
        shelter={shelter}
        familyDetails={familyDetails}
      />
    </div>
  );
}
