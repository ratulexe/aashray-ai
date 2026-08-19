import { useCallback, useEffect, useRef, useState } from "react";
import {
  CircleAlert,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert,
  MapPin,
  Clock3,
  Navigation,
  Radio,
  RefreshCw,
} from "lucide-react";

import FamilyDetailsForm from "../components/citizen/FamilyDetailsForm";
import ReservationConfirmation from "../components/citizen/ReservationConfirmation";
import ShelterRecommendation from "../components/citizen/ShelterRecommendation";
import ShelterSearchState from "../components/citizen/ShelterSearchState";
import { demoUserLocation } from "../data/demoData";
import { findBestShelter } from "../lib/shelterAllocation";
import { getActiveDemoDisaster } from "../services/disasterService";
import { createShelterReservation } from "../services/reservationService";
import { getShelters } from "../services/shelterService";

const reservationPhone = "98XXXXXX12";

function getReservationErrorCopy(errorCode) {
  if (errorCode === "insufficient-capacity") {
    return {
      title: "Shelter Capacity Changed",
      message:
        "This shelter no longer has enough space for your group. Please search again for the safest available shelter.",
    };
  }

  if (errorCode === "shelter-unavailable" || errorCode === "shelter-not-found") {
    return {
      title: "Shelter No Longer Available",
      message:
        "The selected shelter is no longer available for reservation. Please search again for another safe shelter.",
    };
  }

  return {
    title: "Reservation Could Not Be Completed",
    message:
      "Unable to complete the reservation. Please try again or search for another safe shelter.",
  };
}

function ReservationErrorCard({ errorCode, onFindAnother }) {
  const { title, message } = getReservationErrorCopy(errorCode);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
        <TriangleAlert size={30} aria-hidden="true" />
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-700">
          Reservation Issue
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>

        <p className="mt-3 leading-7 text-slate-600">
          {message}
        </p>
      </div>

      <button
        type="button"
        onClick={onFindAnother}
        className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-4 font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100"
      >
        <Navigation size={20} aria-hidden="true" />
        Find Another Shelter
      </button>
    </section>
  );
}

function CitizenLoadingState() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
        <LoaderCircle size={30} className="animate-spin" aria-hidden="true" />
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
          Aashray AI
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Loading Emergency Information
        </h2>

        <p className="mt-3 leading-7 text-slate-600">
          Checking active alerts and available shelters.
        </p>
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-slate-200 p-5">
        <Radio size={20} className="mt-0.5 shrink-0 text-teal-600" aria-hidden="true" />
        <div>
          <p className="font-medium text-slate-900">Firestore connection active</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Retrieving the latest response data for your area.
          </p>
        </div>
      </div>
    </section>
  );
}

function CitizenErrorState({ onRetry, isRetrying }) {
  return (
    <section className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
        <CircleAlert size={30} aria-hidden="true" />
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-700">
          Connection Issue
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Unable to Load Emergency Information
        </h2>

        <p className="mt-3 leading-7 text-slate-600">
          Aashray AI could not retrieve the latest disaster and shelter
          information.
        </p>
      </div>

      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-4 font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        <RefreshCw
          size={20}
          className={isRetrying ? "animate-spin" : ""}
          aria-hidden="true"
        />
        Try Again
      </button>
    </section>
  );
}

function NoShelterDataCard({ onBack }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
        <TriangleAlert size={30} aria-hidden="true" />
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-700">
          Shelter Search
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          No Shelter Data Available
        </h2>

        <p className="mt-3 leading-7 text-slate-600">
          No evacuation shelters are currently available in the system.
        </p>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-4 font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100"
      >
        <Navigation size={20} aria-hidden="true" />
        Back to Family Details
      </button>
    </section>
  );
}

export default function Citizen() {
  const [step, setStep] = useState("alert");
  const [familyDetails, setFamilyDetails] = useState(null);
  const [allocationResult, setAllocationResult] = useState(null);
  const [reservation, setReservation] = useState(null);
  const [reservationErrorCode, setReservationErrorCode] = useState(null);
  const [isReserving, setIsReserving] = useState(false);
  const [activeDisaster, setActiveDisaster] = useState(null);
  const [firestoreShelters, setFirestoreShelters] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const searchTimeoutRef = useRef(null);
  const isMountedRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const dataSourceLoggedRef = useRef(false);

  const hasActiveEmergency =
    activeDisaster && activeDisaster.status === "ACTIVE";

  const resetEmergencyFlow = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    setStep("alert");
    setFamilyDetails(null);
    setAllocationResult(null);
    setReservation(null);
    setReservationErrorCode(null);
    setIsReserving(false);
  }, []);

  const loadFirestoreData = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    try {
      setDataLoading(true);
      setDataError(null);

      const [disaster, shelterData] = await Promise.all([
        getActiveDemoDisaster(),
        getShelters(),
      ]);

      if (!isMountedRef.current || requestId !== loadRequestIdRef.current) {
        return;
      }

      setActiveDisaster(disaster);
      setFirestoreShelters(shelterData);

      if (!disaster) {
        resetEmergencyFlow();
      }

      if (import.meta.env.DEV && !dataSourceLoggedRef.current) {
        console.info("Aashray AI data source: Firestore");
        dataSourceLoggedRef.current = true;
      }
    } catch (error) {
      if (!isMountedRef.current || requestId !== loadRequestIdRef.current) {
        return;
      }

      console.error("Failed to load Firestore data:", error);
      setDataError("Unable to load emergency information.");
      setActiveDisaster(null);
      setFirestoreShelters([]);
    } finally {
      if (isMountedRef.current && requestId === loadRequestIdRef.current) {
        setDataLoading(false);
      }
    }
  }, [resetEmergencyFlow]);

  useEffect(() => {
    isMountedRef.current = true;
    const loadTimer = setTimeout(() => {
      loadFirestoreData();
    }, 0);

    return () => {
      isMountedRef.current = false;
      clearTimeout(loadTimer);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [loadFirestoreData]);

  const handleFamilySubmit = (details) => {
    setFamilyDetails(details);
    setAllocationResult(null);
    setReservation(null);
    setReservationErrorCode(null);
    setStep("searching");

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (firestoreShelters.length === 0) {
        setAllocationResult({
          recommendedShelter: null,
          evaluatedShelters: [],
          rejectedShelters: [],
          error: "NO_SHELTER_DATA",
        });
        setStep("result");
        searchTimeoutRef.current = null;
        return;
      }

      const result = findBestShelter({
        shelters: firestoreShelters,
        familyDetails: details,
        disasterType: activeDisaster?.type,
        userLocation: demoUserLocation,
      });

      setAllocationResult(result);
      setStep("result");
      searchTimeoutRef.current = null;
    }, 900);
  };

  const updateLocalShelterReservation = useCallback((reservationResult) => {
    setFirestoreShelters((currentShelters) =>
      currentShelters.map((shelter) =>
        shelter.id === reservationResult.shelterId
          ? {
              ...shelter,
              reserved: reservationResult.reservedAfter,
            }
          : shelter,
      ),
    );

    setAllocationResult((currentResult) => {
      if (!currentResult?.recommendedShelter) {
        return currentResult;
      }

      if (currentResult.recommendedShelter.id !== reservationResult.shelterId) {
        return currentResult;
      }

      return {
        ...currentResult,
        recommendedShelter: {
          ...currentResult.recommendedShelter,
          reserved: reservationResult.reservedAfter,
          availableCapacity: reservationResult.availableAfter,
        },
      };
    });
  }, []);

  const handleReserve = async () => {
    if (isReserving) {
      return;
    }

    const recommendedShelter = allocationResult?.recommendedShelter;

    if (!recommendedShelter || !familyDetails) {
      setReservationErrorCode(null);
      setStep("reservationError");
      return;
    }

    try {
      setIsReserving(true);
      setReservationErrorCode(null);

      const reservationResult = await createShelterReservation({
        shelterId: recommendedShelter.id,
        familyDetails,
        phone: reservationPhone,
        userLocation: demoUserLocation,
      });

      if (!isMountedRef.current) {
        return;
      }

      setReservation(reservationResult);
      updateLocalShelterReservation(reservationResult);
      setStep("reserved");
    } catch (error) {
      console.error("Reservation failed:", {
        code: error?.code ?? "unknown",
        message: error?.message ?? String(error),
        error,
      });

      if (!isMountedRef.current) {
        return;
      }

      setReservation(null);
      setReservationErrorCode(error?.code ?? null);
      setStep("reservationError");
    } finally {
      if (isMountedRef.current) {
        setIsReserving(false);
      }
    }
  };

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

        {dataLoading && <CitizenLoadingState />}

        {!dataLoading && dataError && (
          <CitizenErrorState
            onRetry={loadFirestoreData}
            isRetrying={dataLoading}
          />
        )}

        {/* NORMAL STATE */}
        {!dataLoading && !dataError && !hasActiveEmergency && (
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
        {!dataLoading && !dataError && hasActiveEmergency && step === "alert" && (
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

        {!dataLoading && !dataError && hasActiveEmergency && step === "family" && (
          <FamilyDetailsForm
            initialDetails={familyDetails}
            onBack={() => setStep("alert")}
            onSubmit={handleFamilySubmit}
          />
        )}

        {!dataLoading && !dataError && hasActiveEmergency && step === "searching" && (
          <ShelterSearchState />
        )}

        {!dataLoading &&
          !dataError &&
          hasActiveEmergency &&
          step === "result" &&
          familyDetails &&
          allocationResult?.error === "NO_SHELTER_DATA" && (
            <NoShelterDataCard onBack={() => setStep("family")} />
          )}

        {!dataLoading &&
          !dataError &&
          hasActiveEmergency &&
          step === "result" &&
          familyDetails &&
          allocationResult?.error !== "NO_SHELTER_DATA" && (
          <ShelterRecommendation
            shelter={allocationResult?.recommendedShelter ?? null}
            familyDetails={familyDetails}
            onBack={() => setStep("family")}
            onReserve={handleReserve}
            isReserving={isReserving}
          />
        )}

        {!dataLoading &&
          !dataError &&
          hasActiveEmergency &&
          step === "reserved" &&
          reservation &&
          allocationResult?.recommendedShelter &&
          familyDetails && (
            <ReservationConfirmation
              reservation={reservation}
              shelter={allocationResult.recommendedShelter}
              familyDetails={familyDetails}
            />
          )}

        {!dataLoading &&
          !dataError &&
          hasActiveEmergency &&
          step === "reservationError" && (
          <ReservationErrorCard
            errorCode={reservationErrorCode}
            onFindAnother={() => {
              setReservation(null);
              setAllocationResult(null);
              setReservationErrorCode(null);
              setIsReserving(false);
              setStep("family");
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
