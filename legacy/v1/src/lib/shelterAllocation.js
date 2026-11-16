import { calculateDistanceKm } from "./distance.js";

const IMPORTANT_FACILITIES = [
  "Drinking Water",
  "Food",
  "Toilets",
  "Electricity",
  "First Aid",
  "Wheelchair Access",
];

function getAvailableCapacity(shelter) {
  return shelter.capacity - shelter.occupied - shelter.reserved;
}

function isValidCoordinate(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidLocation(location) {
  return (
    location &&
    isValidCoordinate(location.latitude) &&
    isValidCoordinate(location.longitude)
  );
}

function getDisasterSafetyReason(shelter, disasterType) {
  const normalizedType = disasterType?.toUpperCase();

  if (normalizedType === "CYCLONE" && !shelter.cycloneSafe) {
    return "Not safe for cyclone";
  }

  if (normalizedType === "FLOOD" && !shelter.floodSafe) {
    return "Not safe for flood";
  }

  return null;
}

function getRejectionReason({ shelter, familyDetails, disasterType, availableCapacity }) {
  if (shelter.status !== "AVAILABLE") {
    return "Shelter unavailable";
  }

  const safetyReason = getDisasterSafetyReason(shelter, disasterType);

  if (safetyReason) {
    return safetyReason;
  }

  if (availableCapacity < familyDetails.totalPeople) {
    return "Insufficient capacity";
  }

  if (familyDetails.mobilityAssistance && !shelter.accessible) {
    return "Mobility accessibility unavailable";
  }

  if (!shelter.routeAccessible) {
    return "Route inaccessible";
  }

  return null;
}

function roundScore(value) {
  return Math.round(value * 10) / 10;
}

function scoreShelter(shelter, availableCapacity, distanceKm) {
  const safety = (shelter.safetyScore / 100) * 40;
  const capacity = Math.min(availableCapacity / 200, 1) * 25;
  const distance = Math.max(0, 1 - distanceKm / 10) * 20;
  const route = 10;
  const supportedFacilities = IMPORTANT_FACILITIES.filter((facility) =>
    shelter.facilities.includes(facility),
  );
  const facilities = (supportedFacilities.length / IMPORTANT_FACILITIES.length) * 5;

  const scoreBreakdown = {
    safety: roundScore(safety),
    capacity: roundScore(capacity),
    distance: roundScore(distance),
    route: roundScore(route),
    facilities: roundScore(facilities),
  };

  const suitabilityScore = roundScore(
    scoreBreakdown.safety +
      scoreBreakdown.capacity +
      scoreBreakdown.distance +
      scoreBreakdown.route +
      scoreBreakdown.facilities,
  );

  return {
    ...shelter,
    availableCapacity,
    distanceKm: Number(distanceKm.toFixed(2)),
    suitabilityScore,
    scoreBreakdown,
  };
}

export function findBestShelter({ shelters, familyDetails, disasterType, userLocation }) {
  if (!isValidLocation(userLocation)) {
    return {
      recommendedShelter: null,
      evaluatedShelters: [],
      rejectedShelters: [],
      error: "Citizen location unavailable",
    };
  }

  const evaluatedShelters = [];
  const rejectedShelters = [];

  shelters.forEach((shelter) => {
    const distanceKm = calculateDistanceKm(
      userLocation.latitude,
      userLocation.longitude,
      shelter.latitude,
      shelter.longitude,
    );
    const availableCapacity = getAvailableCapacity(shelter);
    const reason = getRejectionReason({
      shelter,
      familyDetails,
      disasterType,
      availableCapacity,
    });

    if (reason) {
      rejectedShelters.push({
        shelterId: shelter.id,
        name: shelter.name,
        distanceKm: Number(distanceKm.toFixed(2)),
        reason,
      });
      return;
    }

    evaluatedShelters.push(scoreShelter(shelter, availableCapacity, distanceKm));
  });

  evaluatedShelters.sort((first, second) => {
    if (second.suitabilityScore !== first.suitabilityScore) {
      return second.suitabilityScore - first.suitabilityScore;
    }

    return first.distanceKm - second.distanceKm;
  });

  return {
    recommendedShelter: evaluatedShelters[0] ?? null,
    evaluatedShelters,
    rejectedShelters,
  };
}
