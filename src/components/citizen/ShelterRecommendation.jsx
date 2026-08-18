import {
  Accessibility,
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Droplets,
  HeartPulse,
  House,
  MapPin,
  Route,
  ShieldCheck,
  Utensils,
  Users,
  Zap,
} from "lucide-react";

const facilityIcons = {
  "Drinking Water": Droplets,
  Food: Utensils,
  Toilets: Users,
  Electricity: Zap,
  "First Aid": HeartPulse,
  "Wheelchair Access": Accessibility,
};

function getSelectionReasons(shelter, familyDetails) {
  const reasons = [];

  if (shelter.cycloneSafe) {
    reasons.push("Suitable for the current cyclone");
  }

  if (shelter.availableCapacity >= familyDetails.totalPeople) {
    reasons.push(`Enough capacity for ${familyDetails.totalPeople} people`);
  }

  if (shelter.routeAccessible) {
    reasons.push("Safe route available");
  }

  if (!familyDetails.mobilityAssistance || shelter.accessible) {
    reasons.push(
      familyDetails.mobilityAssistance
        ? "Supports help moving around"
        : "No extra movement support required",
    );
  }

  if (shelter.safetyScore >= 90) {
    reasons.push("High safety rating");
  }

  return reasons;
}

function NoSuitableShelter({ onBack }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
        <CircleAlert size={30} aria-hidden="true" />
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-700">
          Shelter Search
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          No Suitable Shelter Found
        </h2>

        <p className="mt-3 leading-7 text-slate-600">
          No currently available shelter meets all safety, capacity and
          accessibility requirements.
        </p>

        <p className="mt-3 leading-7 text-slate-600">
          Request assistance or try again shortly.
        </p>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-4 font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100"
      >
        <ArrowLeft size={20} aria-hidden="true" />
        Back to Family Details
      </button>
    </section>
  );
}

export default function ShelterRecommendation({
  shelter,
  familyDetails,
  onBack,
  onReserve,
}) {
  if (!shelter) {
    return <NoSuitableShelter onBack={onBack} />;
  }

  const selectionReasons = getSelectionReasons(shelter, familyDetails);
  const scoreRows = [
    ["Safety", shelter.scoreBreakdown.safety, 40],
    ["Capacity", shelter.scoreBreakdown.capacity, 25],
    ["Distance", shelter.scoreBreakdown.distance, 20],
    ["Route", shelter.scoreBreakdown.route, 10],
    ["Facilities", shelter.scoreBreakdown.facilities, 5],
  ];

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-teal-50 p-6 sm:p-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-2xl px-1 py-2 text-sm font-semibold text-teal-800 transition hover:text-teal-950 focus:outline-none focus:ring-4 focus:ring-teal-100"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Change Family Details
        </button>

        <div className="mt-5 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-700">
            <House size={30} aria-hidden="true" />
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
              Safe Shelter Found
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {shelter.name}
            </h2>

            <p className="mt-3 flex items-center gap-2 leading-7 text-slate-700">
              <MapPin size={19} className="shrink-0" aria-hidden="true" />
              {shelter.location}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Distance</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {shelter.distanceKm.toFixed(1)} km away
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Suitability Score</p>
            <p className="mt-2 text-xl font-bold text-teal-700">
              {shelter.suitabilityScore} / 100
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-teal-700" aria-hidden="true" />
              <p className="text-sm text-slate-500">Available Capacity</p>
            </div>
            <p className="mt-3 font-semibold text-slate-900">
              {shelter.availableCapacity} spaces
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <Route size={20} className="text-teal-700" aria-hidden="true" />
              <p className="text-sm text-slate-500">Route</p>
            </div>
            <p className="mt-3 font-semibold text-slate-900">Accessible</p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5 sm:col-span-2">
            <div className="flex items-center gap-3">
              <Accessibility size={20} className="text-teal-700" aria-hidden="true" />
              <p className="text-sm text-slate-500">Extra Help</p>
            </div>
            <p className="mt-3 font-semibold text-slate-900">
              {shelter.accessible
                ? "Help moving around supported"
                : "Help moving around not supported"}
            </p>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-slate-900">Facilities</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {shelter.facilities.map((facility) => {
              const Icon = facilityIcons[facility] ?? CheckCircle2;

              return (
                <div
                  key={facility}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-slate-700"
                >
                  <Icon size={19} className="shrink-0 text-teal-700" aria-hidden="true" />
                  <span className="text-sm font-medium">{facility}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-900">
            Why Aashray selected this shelter
          </h3>

          <div className="mt-4 grid gap-3">
            {selectionReasons.map((reason) => (
              <div key={reason} className="flex items-start gap-3">
                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0 text-teal-700"
                  aria-hidden="true"
                />
                <p className="text-sm leading-6 text-slate-600">{reason}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck size={21} className="mt-0.5 shrink-0 text-teal-700" aria-hidden="true" />
            <div>
              <h3 className="font-bold text-slate-900">
                Deterministic Shelter Suitability Score
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                The score is calculated from shelter data, not generated as a
                prediction.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {scoreRows.map(([label, score, max]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
              >
                <span className="text-sm font-medium text-slate-600">{label}</span>
                <span className="font-bold tabular-nums text-slate-900">
                  {score} / {max}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onReserve}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-4 font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100"
        >
          Reserve {familyDetails.totalPeople} Spaces
        </button>
      </div>
    </section>
  );
}
