import { useState } from "react";
import {
  ShieldCheck,
  TriangleAlert,
  MapPin,
  Clock3,
  Navigation,
  Radio,
} from "lucide-react";

import FamilyDetailsForm from "../components/citizen/FamilyDetailsForm";
import { activeDisaster } from "../data/demoData";

export default function Citizen() {
  const [step, setStep] = useState("alert");
  const [familyDetails, setFamilyDetails] = useState(null);

  const hasActiveEmergency =
    activeDisaster && activeDisaster.status === "ACTIVE";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-2xl">

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3"><div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Aashray AI
              </h1>
              <p className="text-sm text-slate-500">
                Disaster Evacuation & Shelter Coordination
              </p>
            </div>
          </div>
        </header>

        {/* NORMAL STATE */}
        {!hasActiveEmergency && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={30} />
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium text-slate-500">
                Your Safety Status
              </p>

              <h2 className="mt-1 text-3xl font-bold text-emerald-600">
                Safe
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                There are currently no active emergency alerts affecting your
                location.
              </p>
            </div>

            <div className="mt-8 rounded-2xl bg-slate-50 p-5">
              <div className="flex items-start gap-3">
                <MapPin
                  size={21}
                  className="mt-0.5 shrink-0 text-slate-500"
                />

                <div>
                  <p className="text-sm text-slate-500">
                    Current Location
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    Diamond Harbour, West Bengal
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 p-5">
              <Radio
                size={20}
                className="mt-0.5 shrink-0 text-teal-600"
              />

              <div>
                <p className="font-medium text-slate-900">
                  Emergency monitoring active
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Aashray AI is monitoring active emergency information for
                  your area.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* EMERGENCY STATE */}
        {hasActiveEmergency && step === "alert" && (
          <section className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">

            {/* Alert Header */}
            <div className="bg-red-50 p-6 sm:p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <TriangleAlert size={30} />
              </div>

              <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-red-600">
                Emergency Alert
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {activeDisaster.title}
              </h2>

              <p className="mt-3 max-w-xl leading-7 text-slate-700">
                {activeDisaster.message}
              </p>
            </div>

            {/* Disaster Details */}
            <div className="p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">

                {/* Risk */}
                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center gap-3">
                    <TriangleAlert
                      size={20}
                      className="text-red-600"
                    />

                    <p className="text-sm text-slate-500">
                      Risk Level
                    </p>
                  </div>

                  <p className="mt-3 text-lg font-bold text-red-600">
                    {activeDisaster.severity}
                  </p>
                </div>

                {/* Area */}
                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center gap-3">
                    <MapPin
                      size={20}
                      className="text-slate-600"
                    />

                    <p className="text-sm text-slate-500">
                      Affected Area
                    </p>
                  </div>

                  <p className="mt-3 font-semibold text-slate-900">
                    {activeDisaster.affectedArea}
                  </p>
                </div>

                {/* Duration */}
                <div className="rounded-2xl border border-slate-200 p-5 sm:col-span-2">
                  <div className="flex items-center gap-3">
                    <Clock3
                      size={20}
                      className="text-slate-600"
                    />

                    <p className="text-sm text-slate-500">
                      Expected Duration
                    </p>
                  </div>

                  <p className="mt-3 font-semibold text-slate-900">
                    Approximately{" "}
                    {activeDisaster.expectedDurationHours} hours
                  </p>
                </div>
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={() => setStep("family")}
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100"
              >
                <Navigation size={20} />
                Find Safe Shelter
              </button>

              <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                Aashray AI will evaluate shelters based on safety, available
                capacity, current location, accessibility and route conditions.
              </p>
            </div>
          </section>
        )}

        {hasActiveEmergency && step === "family" && (
          <FamilyDetailsForm
            onBack={() => setStep("alert")}
            onSubmit={(details) => {
              setFamilyDetails(details);
              console.log("Family details:", details);
            }}
          />
        )}

        <p className="sr-only" aria-live="polite">
          {familyDetails ? "Family details saved" : ""}
        </p>
      </div>
    </main>
  );
}
