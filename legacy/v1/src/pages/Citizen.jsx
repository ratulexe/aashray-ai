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
  RotateCcw,
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
const GEOLOCATION_TIMEOUT_MS = 4000;
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

function getLocationCopy(locationStatus, locationMode = "device") {
  if (locationMode === "demo") {
    return "Demo Location";
  }

  if (locationStatus === "ready") {
    return "Device GPS";
  }

  if (locationStatus === "denied") {
    return "Device GPS permission denied";
  }

  if (locationStatus === "unsupported") {
    return "Device GPS unavailable";
  }

  if (locationStatus === "error") {
    return "Device GPS could not be loaded";
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
        enableHighAccuracy: false,
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: 300000,
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

function getLocationFailureStatus(error) {
  if (error?.code === 1) {
    return "denied";
  }

  if (error?.message === "GEOLOCATION_UNSUPPORTED") {
    return "unsupported";
  }

  return "error";
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

function DemoModeBadge() {
  return (
    <span className="inline-flex min-h-8 items-center rounded-full bg-amber-100 px-3 text-xs font-black uppercase tracking-wider text-amber-800">
      Demo Mode
    </span>
  );
}

function DemoLocationControl({
  locationMode,
  locationStatus,
  onUseDemoLocation,
  onUseMyLocation,
  isRetryingLocation,
}) {
  const isDemo = locationMode === "demo";
  const isDetecting = !isDemo && locationStatus === "loading";
  const locationFailed =
    !isDemo && ["denied", "unsupported", "error"].includes(locationStatus);
  const title = isDemo
    ? "Demo Location"
    : isDetecting
      ? "Detecting your location..."
      : locationFailed
        ? "Location is taking longer than expected."
        : "Use Demo Location";
  const description = isDemo
    ? "Diamond Harbour evacuation scenario is active for this prototype demonstration."
    : isDetecting
      ? "This may take a few seconds. You can use the demo location any time for the prototype flow."
      : locationFailed
        ? "Retry GPS or use the demo location to simulate a resident inside the Diamond Harbour evacuation area."
        : "Your current location is outside this evacuation zone. Use the demo location to simulate a resident inside the Diamond Harbour evacuation area.";

  return (
    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-800">
              Prototype Demo
            </p>
            {isDemo && <DemoModeBadge />}
          </div>

          <h3 className="mt-2 text-xl font-bold text-slate-900">
            {title}
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
            {description}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-52">
          {isDemo ? (
            <button
              type="button"
              onClick={onUseMyLocation}
              disabled={isRetryingLocation}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 focus:outline-none focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
              aria-label="Return to my device GPS location"
            >
              <RotateCcw size={17} aria-hidden="true" />
              {isRetryingLocation ? "Loading My Location" : "Return to My Location"}
            </button>
          ) : (
            <>
              {locationFailed && (
                <button
                  type="button"
                  onClick={onUseMyLocation}
                  disabled={isRetryingLocation}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 focus:outline-none focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
                  aria-label="Retry device GPS location detection"
                >
                  <RefreshCw
                    size={17}
                    className={isRetryingLocation ? "animate-spin" : ""}
                    aria-hidden="true"
                  />
                  {isRetryingLocation ? "Retrying GPS" : "Retry GPS"}
                </button>
              )}

              <button
                type="button"
                onClick={onUseDemoLocation}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-100"
                aria-label="Use the simulated Diamond Harbour demo location"
              >
                <MapPin size={17} aria-hidden="true" />
                Use Demo Location
              </button>
            </>
          )}

          <p className="text-xs font-medium leading-5 text-amber-800">
            Active source: {getLocationCopy(locationStatus, locationMode)}
          </p>
        </div>
      </div>
    </div>
  );
}

function ActiveEmergencyElsewhereCard({
  disaster,
  assessment,
  locationStatus,
  locationMode,
  onUseDemoLocation,
  onUseMyLocation,
  isRetryingLocation,
}) {
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
            {getLocationCopy(locationStatus, locationMode)}
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

      <DemoLocationControl
        locationMode={locationMode}
        locationStatus={locationStatus}
        onUseDemoLocation={onUseDemoLocation}
        onUseMyLocation={onUseMyLocation}
        isRetryingLocation={isRetryingLocation}
      />
    </section>
  );
}

function LocationUnavailableDuringEmergencyCard({
  disaster,
  locationStatus,
  locationMode,
  onUseDemoLocation,
  onUseMyLocation,
  isRetryingLocation,
}) {
  const isDetecting = locationMode !== "demo" && locationStatus === "loading";
  const locationFailed =
    locationMode !== "demo" && ["denied", "unsupported", "error"].includes(locationStatus);
  const title = isDetecting
    ? "Detecting your location..."
    : locationFailed
      ? "Location is taking longer than expected."
      : disaster.title;
  const message = isDetecting
    ? "This may take a few seconds. You can use the demo location while device GPS is still loading."
    : locationFailed
      ? "Retry GPS or use the demo location to continue the prototype evacuation flow."
      : "Aashray AI needs your device GPS location to check whether this active emergency affects you.";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
        <MapPin size={30} aria-hidden="true" />
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-700">
          Location Check Needed
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>

        <p className="mt-3 leading-7 text-slate-600">
          {message}
        </p>

        <p className="mt-3 text-sm font-semibold text-slate-600">
          Active alert: {disaster.title}
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 p-5">
        <p className="text-sm text-slate-500">Current location source</p>
        <p className="mt-2 font-semibold text-slate-900">
          {getLocationCopy(locationStatus, locationMode)}
        </p>
      </div>

      <DemoLocationControl
        locationMode={locationMode}
        locationStatus={locationStatus}
        onUseDemoLocation={onUseDemoLocation}
        onUseMyLocation={onUseMyLocation}
        isRetryingLocation={isRetryingLocation}
      />
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

function getKnownCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

// Categories the AI could not determine stay `null` so the citizen has to state
// them explicitly. People the AI counted but could not categorise are never
// folded into another category.
function getReviewFamilyDraftFromAIResult(aiResult) {
  const peopleCount =
    Number.isInteger(aiResult?.peopleCount) && aiResult.peopleCount > 0
      ? aiResult.peopleCount
      : null;

  return {
    adults: getKnownCount(aiResult?.adults),
    children: getKnownCount(aiResult?.children),
    elderly: getKnownCount(aiResult?.elderly),
    mobilityAssistance: Boolean(aiResult?.mobilityAssistance),
    expectedTotalPeople: peopleCount,
  };
}

export default function Citizen() {
  const [step, setStep] = useState("alert");
  const [familyDetails, setFamilyDetails] = useState(null);
  const [aiEmergencyDraft, setAiEmergencyDraft] = useState({
    message: "",
    result: null,
  });
  const [allocationResult, setAllocationResult] = useState(null);
  const [reservation, setReservation] = useState(null);
  const [reservationErrorCode, setReservationErrorCode] = useState(null);
  const [isReserving, setIsReserving] = useState(false);
  const [activeDisaster, setActiveDisaster] = useState(null);
  const [firestoreShelters, setFirestoreShelters] = useState([]);
  const [deviceLocation, setDeviceLocation] = useState(null);
  const [locationMode, setLocationMode] = useState("device");
  const [locationStatus, setLocationStatus] = useState("loading");
  const [isRetryingLocation, setIsRetryingLocation] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const searchTimeoutRef = useRef(null);
  const isMountedRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const locationRequestIdRef = useRef(0);
  const dataSourceLoggedRef = useRef(false);

  const hasActiveEmergency =
    activeDisaster && activeDisaster.status === "ACTIVE";
  const userLocation =
    locationMode === "demo" ? demoUserLocation : deviceLocation;
  const emergencyAssessment = getEmergencyAssessment(activeDisaster, userLocation);
  const isCriticalEmergency =
    hasActiveEmergency && emergencyAssessment.status === "critical";
  const isActiveEmergencyElsewhere =
    hasActiveEmergency && emergencyAssessment.status === "elsewhere";
  const isActiveEmergencyLocationUnavailable =
    hasActiveEmergency && emergencyAssessment.status === "inactive";

  const resetEmergencyFlow = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    setStep("alert");
    setFamilyDetails(null);
    setAiEmergencyDraft({ message: "", result: null });
    setAllocationResult(null);
    setReservation(null);
    setReservationErrorCode(null);
    setIsReserving(false);
  }, []);

  const startDeviceLocationLookup = useCallback(async ({
    switchToDevice = false,
  } = {}) => {
    const requestId = locationRequestIdRef.current + 1;
    locationRequestIdRef.current = requestId;

    try {
      setIsRetryingLocation(true);
      setLocationStatus("loading");

      const location = await getBrowserLocation();

      if (!isMountedRef.current || requestId !== locationRequestIdRef.current) {
        return;
      }

      setDeviceLocation(location);
      setLocationStatus("ready");

      if (switchToDevice) {
        setLocationMode("device");
        resetEmergencyFlow();
      }
    } catch (error) {
      if (!isMountedRef.current || requestId !== locationRequestIdRef.current) {
        return;
      }

      const status = getLocationFailureStatus(error);

      setDeviceLocation(null);
      setLocationStatus(status);

      if (import.meta.env.DEV) {
        console.warn("Citizen device location unavailable:", {
          status,
          code: error?.code ?? "unknown",
          message: error?.message ?? String(error),
        });
      }
    } finally {
      if (isMountedRef.current && requestId === locationRequestIdRef.current) {
        setIsRetryingLocation(false);
      }
    }
  }, [resetEmergencyFlow]);

  const handleUseDemoLocation = useCallback(() => {
    setLocationMode("demo");
    resetEmergencyFlow();
  }, [resetEmergencyFlow]);

  const handleUseMyLocation = useCallback(async () => {
    if (deviceLocation) {
      setLocationMode("device");
      resetEmergencyFlow();
      return;
    }

    await startDeviceLocationLookup({ switchToDevice: true });
  }, [deviceLocation, resetEmergencyFlow, startDeviceLocationLookup]);

  const loadCitizenData = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    try {
      setDataLoading(true);
      setDataError(null);

      const [disasterResult, shelterResult] = await Promise.all([
        loadDisasterWithFallback(),
        loadSheltersWithFallback(),
      ]);

      if (!isMountedRef.current || requestId !== loadRequestIdRef.current) {
        return;
      }

      const disaster = disasterResult.disaster;
      const shelterData = shelterResult.shelters;

      setActiveDisaster(disaster);
      setFirestoreShelters(shelterData);

      if (!disaster) {
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

      startDeviceLocationLookup();
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
  }, [resetEmergencyFlow, startDeviceLocationLookup]);

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
    setAiEmergencyDraft((currentDraft) => ({
      ...currentDraft,
      result: aiResult,
    }));

    const details = getFamilyDetailsFromAIResult(aiResult);

    if (!details) {
      setFamilyDetails(getReviewFamilyDraftFromAIResult(aiResult));
      setAllocationResult(null);
      setReservation(null);
      setReservationErrorCode(null);
      setStep("family");
      return;
    }

    handleFamilySubmit(details);
  };

  const handleAIEdit = (aiResult) => {
    setAiEmergencyDraft((currentDraft) => ({
      ...currentDraft,
      result: aiResult,
    }));
    setFamilyDetails(getReviewFamilyDraftFromAIResult(aiResult));
    setAllocationResult(null);
    setReservation(null);
    setReservationErrorCode(null);
    setStep("family");
  };

  const handleAIAnalyzed = (aiResult, message) => {
    setAiEmergencyDraft({
      message,
      result: aiResult,
    });
  };

  const handleAIDraftChange = (message) => {
    setAiEmergencyDraft({
      message,
      result: null,
    });
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
                    {getLocationCopy(locationStatus, locationMode)}
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
            locationMode={locationMode}
            onUseDemoLocation={handleUseDemoLocation}
            onUseMyLocation={handleUseMyLocation}
            isRetryingLocation={isRetryingLocation}
          />
        )}

        {!dataLoading && !dataError && isActiveEmergencyLocationUnavailable && (
          <LocationUnavailableDuringEmergencyCard
            disaster={activeDisaster}
            locationStatus={locationStatus}
            locationMode={locationMode}
            onUseDemoLocation={handleUseDemoLocation}
            onUseMyLocation={handleUseMyLocation}
            isRetryingLocation={isRetryingLocation}
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
                locationMode={locationMode}
                onFindShelter={() => setStep("ai")}
              />

              <CycloneTrackingPanel disaster={activeDisaster} />
            </div>

            {locationMode === "demo" && (
              <DemoLocationControl
                locationMode={locationMode}
                locationStatus={locationStatus}
                onUseDemoLocation={handleUseDemoLocation}
                onUseMyLocation={handleUseMyLocation}
                isRetryingLocation={isRetryingLocation}
              />
            )}

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
            initialMessage={aiEmergencyDraft.message}
            initialResult={aiEmergencyDraft.result}
            onBack={() => setStep("alert")}
            onManual={() => {
              setFamilyDetails(null);
              setStep("family");
            }}
            onAnalyzed={handleAIAnalyzed}
            onDraftChange={handleAIDraftChange}
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
