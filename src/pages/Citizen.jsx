import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
} from "lucide-react";

import { AppHeader } from "../components/AppHeader";
import AIEmergencyUnderstanding from "../components/citizen/AIEmergencyUnderstanding";
import FamilyDetailsForm from "../components/citizen/FamilyDetailsForm";
import CinematicEmergencyCard from "../components/citizen/CinematicEmergencyCard";
import CycloneTrackingPanel from "../components/citizen/CycloneTrackingPanel";
import ReservationConfirmation from "../components/citizen/ReservationConfirmation";
import ShelterRecommendation from "../components/citizen/ShelterRecommendation";
import ShelterSearchState from "../components/citizen/ShelterSearchState";
import { activeDisaster as demoActiveDisaster, demoUserLocation } from "../data/demoData";
import { shelters as demoShelters } from "../data/shelters";
import { calculateDistanceKm } from "../lib/distance";
import { findBestShelter } from "../lib/shelterAllocation";
import { getActiveDemoDisaster } from "../services/disasterService";
import { createShelterReservation } from "../services/reservationService";
import { getShelters } from "../services/shelterService";

const reservationPhone = "98XXXXXX12";
const GEOLOCATION_TIMEOUT_MS = 10000;
const DEFAULT_DISASTER_CENTER = demoUserLocation;

const citizenSteps = ["Family", "Shelter", "Reservation"];

function CitizenFlowProgress({ step }) {
  const currentStep =
    step === "ai" || step === "family"
      ? 0
      : step === "searching" || step === "result"
        ? 1
        : 2;

  return (
    <nav className="citizen-progress" aria-label="Evacuation progress">
      <ol>
        {citizenSteps.map((label, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <li
              key={label}
              className={isComplete ? "complete" : isCurrent ? "current" : ""}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span aria-hidden="true">
                {isComplete ? <CheckCircle2 size={15} /> : index + 1}
              </span>
              {label}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

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

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isUsableLocation(location) {
  return (
    location &&
    isFiniteNumber(location.latitude) &&
    isFiniteNumber(location.longitude)
  );
}

function toLocation(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const latitude = value.latitude ?? value.lat;
  const longitude = value.longitude ?? value.lng ?? value.lon;

  if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function getDisasterCenter(disaster) {
  return (
    toLocation(disaster) ??
    toLocation(disaster?.center) ??
    toLocation(disaster?.location) ??
    toLocation(disaster?.coordinates) ??
    DEFAULT_DISASTER_CENTER
  );
}

function getEmergencyAssessment(disaster, userLocation) {
  if (!disaster || disaster.status !== "ACTIVE" || !isUsableLocation(userLocation)) {
    return {
      status: "inactive",
      distanceKm: null,
      isInsideRadius: false,
    };
  }

  const disasterCenter = getDisasterCenter(disaster);
  const radiusKm = isFiniteNumber(disaster.radiusKm) ? disaster.radiusKm : 0;
  const distanceKm = calculateDistanceKm(
    userLocation.latitude,
    userLocation.longitude,
    disasterCenter.latitude,
    disasterCenter.longitude,
  );

  return {
    status: distanceKm <= radiusKm ? "critical" : "elsewhere",
    distanceKm,
    isInsideRadius: distanceKm <= radiusKm,
    radiusKm,
    disasterCenter,
  };
}

function getLocationCopy(locationStatus) {
  if (locationStatus === "ready") {
    return "Current location loaded";
  }

  if (locationStatus === "fallback") {
    return "Using demo location fallback";
  }

  if (locationStatus === "denied") {
    return "Permission denied; using demo location";
  }

  if (locationStatus === "unsupported") {
    return "Current location unavailable; using demo location";
  }

  if (locationStatus === "error") {
    return "Location could not be loaded; using demo location";
  }

  return "Loading current location";
}

function getBrowserLocation() {
  if (!("geolocation" in navigator)) {
    return Promise.reject(new Error("GEOLOCATION_UNSUPPORTED"));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: 60000,
      },
    );
  });
}

function getFirebaseErrorDetails(error) {
  return {
    code: error?.code ?? "unknown",
    message: error?.message ?? String(error),
  };
}

async function loadDisasterWithFallback() {
  try {
    return {
      disaster: await getActiveDemoDisaster(),
      source: "Firestore",
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.info(
        "Using bundled demo disaster because Firestore disaster data is unavailable:",
        getFirebaseErrorDetails(error),
      );
    }

    return {
      disaster: demoActiveDisaster.status === "ACTIVE" ? demoActiveDisaster : null,
      source: "Demo fallback",
    };
  }
}

async function loadSheltersWithFallback() {
  try {
    return {
      shelters: await getShelters(),
      source: "Firestore",
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.info(
        "Using bundled demo shelters because Firestore shelter data is unavailable:",
        getFirebaseErrorDetails(error),
      );
    }

    return {
      shelters: demoShelters,
      source: "Demo fallback",
    };
  }
}

function ActiveEmergencyElsewhereCard({ disaster, assessment, locationStatus }) {
  const distanceLabel = Number.isFinite(assessment.distanceKm)
    ? `${assessment.distanceKm.toFixed(1)} km from the affected zone center`
    : "Outside the affected evacuation zone";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
        <Radio size={30} aria-hidden="true" />
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-700">
          Active Emergency Elsewhere
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          {disaster.title}
        </h2>

        <p className="mt-3 leading-7 text-slate-600">
          An emergency is active in {disaster.affectedArea}, but your current
          location is outside the configured evacuation radius.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Current location</p>
          <p className="mt-2 font-semibold text-slate-900">
            {getLocationCopy(locationStatus)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Distance check</p>
          <p className="mt-2 font-semibold text-slate-900">
            {distanceLabel}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 p-5">
        <MapPin size={20} className="mt-0.5 shrink-0 text-teal-600" aria-hidden="true" />
        <div>
          <p className="font-medium text-slate-900">Monitoring remains active</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            If your location changes or the affected radius expands, refresh to
            run the location check again.
          </p>
        </div>
      </div>
    </section>
  );
}

function getFamilyDetailsFromAIResult(aiResult) {
  if (
    aiResult?.needsReview ||
    !Number.isInteger(aiResult?.peopleCount) ||
    !Number.isInteger(aiResult?.adults) ||
    !Number.isInteger(aiResult?.children) ||
    !Number.isInteger(aiResult?.elderly) ||
    aiResult.peopleCount !== aiResult.adults + aiResult.children + aiResult.elderly
  ) {
    return null;
  }

  return {
    adults: aiResult.adults,
    children: aiResult.children,
    elderly: aiResult.elderly,
    totalPeople: aiResult.peopleCount,
    mobilityAssistance: Boolean(aiResult.mobilityAssistance),
  };
}

function getEditableFamilyDetailsFromAIResult(aiResult) {
  return {
    adults: Number.isInteger(aiResult?.adults) && aiResult.adults > 0 ? aiResult.adults : 1,
    children: Number.isInteger(aiResult?.children) ? aiResult.children : 0,
    elderly: Number.isInteger(aiResult?.elderly) ? aiResult.elderly : 0,
    mobilityAssistance: Boolean(aiResult?.mobilityAssistance),
  };
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
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("loading");
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const searchTimeoutRef = useRef(null);
  const isMountedRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const dataSourceLoggedRef = useRef(false);

  const hasActiveEmergency =
    activeDisaster && activeDisaster.status === "ACTIVE";
  const emergencyAssessment = getEmergencyAssessment(activeDisaster, userLocation);
  const isCriticalEmergency =
    hasActiveEmergency && emergencyAssessment.status === "critical";
  const isActiveEmergencyElsewhere =
    hasActiveEmergency && emergencyAssessment.status === "elsewhere";

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

  const loadCitizenData = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    try {
      setDataLoading(true);
      setDataError(null);
      setLocationStatus("loading");

      const [disasterResult, shelterResult, locationResult] = await Promise.all([
        loadDisasterWithFallback(),
        loadSheltersWithFallback(),
        getBrowserLocation()
          .then((location) => ({
            location,
            status: "ready",
          }))
          .catch((error) => {
            const status =
              error?.code === 1
                ? "denied"
                : error?.message === "GEOLOCATION_UNSUPPORTED"
                  ? "unsupported"
                  : "fallback";

            if (import.meta.env.DEV) {
              console.warn("Using demo citizen location fallback:", {
                status,
                code: error?.code ?? "unknown",
                message: error?.message ?? String(error),
              });
            }

            return {
              location: demoUserLocation,
              status,
            };
          }),
      ]);

      if (!isMountedRef.current || requestId !== loadRequestIdRef.current) {
        return;
      }

      const disaster = disasterResult.disaster;
      const shelterData = shelterResult.shelters;

      setActiveDisaster(disaster);
      setFirestoreShelters(shelterData);
      setUserLocation(locationResult.location);
      setLocationStatus(locationResult.status);

      const assessment = getEmergencyAssessment(disaster, locationResult.location);

      if (!disaster || assessment.status !== "critical") {
        resetEmergencyFlow();
      }

      if (import.meta.env.DEV && !dataSourceLoggedRef.current) {
        console.info(
          "Aashray AI data source:",
          disasterResult.source === "Firestore" &&
            shelterResult.source === "Firestore"
            ? "Firestore"
            : "Demo fallback",
        );
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
      loadCitizenData();
    }, 0);

    return () => {
      isMountedRef.current = false;
      clearTimeout(loadTimer);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [loadCitizenData]);

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
        userLocation,
      });

      setAllocationResult(result);
      setStep("result");
      searchTimeoutRef.current = null;
    }, 900);
  };

  const handleAIConfirm = (aiResult) => {
    const details = getFamilyDetailsFromAIResult(aiResult);

    if (!details) {
      setFamilyDetails(getEditableFamilyDetailsFromAIResult(aiResult));
      setAllocationResult(null);
      setReservation(null);
      setReservationErrorCode(null);
      setStep("family");
      return;
    }

    handleFamilySubmit(details);
  };

  const handleAIEdit = (aiResult) => {
    setFamilyDetails(getEditableFamilyDetailsFromAIResult(aiResult));
    setAllocationResult(null);
    setReservation(null);
    setReservationErrorCode(null);
    setStep("family");
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
        userLocation,
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

  const emergencyOverviewVisible =
    !dataLoading && !dataError && isCriticalEmergency && step === "alert";

  return (
    <main>
      <AppHeader />
      <div className="citizen-page">
        <div className="page-container">
        <header
          className={`citizen-cinematic-header ${
            emergencyOverviewVisible ? "" : "citizen-header-compact"
          }`}
        >
          <p className="citizen-cinematic-kicker">
            People · Shelters · Safer Tomorrow
          </p>
          <h1>
            Aashray <span>AI</span>
          </h1>
          <p className="citizen-cinematic-subtitle">
            Disaster Evacuation &amp; Shelter Coordination
          </p>
        </header>

        {!dataLoading && !dataError && isCriticalEmergency && step !== "alert" && (
          <CitizenFlowProgress step={step} />
        )}

        {dataLoading && <CitizenLoadingState />}

        {!dataLoading && dataError && (
          <CitizenErrorState
            onRetry={loadCitizenData}
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
                    {getLocationCopy(locationStatus)}
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

        {!dataLoading && !dataError && isActiveEmergencyElsewhere && (
          <ActiveEmergencyElsewhereCard
            disaster={activeDisaster}
            assessment={emergencyAssessment}
            locationStatus={locationStatus}
          />
        )}

        {emergencyOverviewVisible && (
          <>
            <div className="citizen-command-layout">
              <aside className="citizen-atmospheric-copy" aria-label="Response values">
                <div>
                  <strong>Early Warnings</strong>
                  <span>Signals that help families act sooner.</span>
                </div>
                <div>
                  <strong>Safer Journeys</strong>
                  <span>Routes assessed for real evacuation needs.</span>
                </div>
                <div>
                  <strong>Stronger Communities</strong>
                  <span>One shared view of shelter readiness.</span>
                </div>
              </aside>

              <CinematicEmergencyCard
                disaster={activeDisaster}
                assessment={emergencyAssessment}
                locationStatus={locationStatus}
                onFindShelter={() => setStep("ai")}
              />

              <CycloneTrackingPanel disaster={activeDisaster} />
            </div>

          </>
        )}

        {!dataLoading && !dataError && isCriticalEmergency && step === "family" && (
          <FamilyDetailsForm
            initialDetails={familyDetails}
            onBack={() => setStep("ai")}
            onSubmit={handleFamilySubmit}
          />
        )}

        {!dataLoading && !dataError && isCriticalEmergency && step === "ai" && (
          <AIEmergencyUnderstanding
            onBack={() => setStep("alert")}
            onManual={() => {
              setFamilyDetails(null);
              setStep("family");
            }}
            onConfirm={handleAIConfirm}
            onEdit={handleAIEdit}
          />
        )}

        {!dataLoading && !dataError && isCriticalEmergency && step === "searching" && (
          <ShelterSearchState />
        )}

        {!dataLoading &&
          !dataError &&
          isCriticalEmergency &&
          step === "result" &&
          familyDetails &&
          allocationResult?.error === "NO_SHELTER_DATA" && (
            <NoShelterDataCard onBack={() => setStep("family")} />
          )}

        {!dataLoading &&
          !dataError &&
          isCriticalEmergency &&
          step === "result" &&
          familyDetails &&
          allocationResult?.error !== "NO_SHELTER_DATA" && (
          <ShelterRecommendation
            shelter={allocationResult?.recommendedShelter ?? null}
            familyDetails={familyDetails}
            disasterType={activeDisaster?.type}
            onBack={() => setStep("family")}
            onReserve={handleReserve}
            isReserving={isReserving}
          />
        )}

        {!dataLoading &&
          !dataError &&
          isCriticalEmergency &&
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
          isCriticalEmergency &&
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
      </div>
    </main>
  );
}
