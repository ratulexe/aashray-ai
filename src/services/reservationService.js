import {
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import { calculateDistanceKm } from "../lib/distance";
import {
  calculateEvacuationEtaMinutes,
  calculateReservationExpiry,
} from "../lib/eta";
import { generateEvacuationCode } from "../lib/reservation";

const MAX_CODE_ATTEMPTS = 5;
const RESERVED_STATUS = "RESERVED";
const AVAILABLE_SHELTER_STATUS = "AVAILABLE";

export class ReservationServiceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ReservationServiceError";
    this.code = code;
  }
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function getFamilyNumber(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function normalizeFamilyDetails(familyDetails) {
  const adults = getFamilyNumber(familyDetails?.adults);
  const children = getFamilyNumber(familyDetails?.children);
  const elderly = getFamilyNumber(familyDetails?.elderly);

  if (adults === null || children === null || elderly === null) {
    throw new ReservationServiceError(
      "invalid-family-size",
      "Family details are incomplete.",
    );
  }

  const peopleCount = adults + children + elderly;

  if (peopleCount <= 0) {
    throw new ReservationServiceError(
      "invalid-family-size",
      "At least one person is required for a reservation.",
    );
  }

  return {
    family: {
      adults,
      children,
      elderly,
      mobilityAssistance: Boolean(familyDetails?.mobilityAssistance),
    },
    peopleCount,
  };
}

function validateCapacityFields(shelter) {
  if (
    !isFiniteNumber(shelter.capacity) ||
    !isFiniteNumber(shelter.occupied) ||
    !isFiniteNumber(shelter.reserved)
  ) {
    throw new ReservationServiceError(
      "invalid-shelter-capacity",
      "Shelter capacity data is invalid.",
    );
  }
}

function validateLocation(location, errorCode, message) {
  if (
    !location ||
    !isFiniteNumber(location.latitude) ||
    !isFiniteNumber(location.longitude)
  ) {
    throw new ReservationServiceError(errorCode, message);
  }
}

async function tryCreateReservation({
  code,
  shelterId,
  family,
  peopleCount,
  phone,
  createdAt,
  userLocation,
}) {
  const shelterRef = doc(db, "shelters", shelterId);
  const reservationRef = doc(db, "reservations", code);

  return runTransaction(db, async (transaction) => {
    const existingReservation = await transaction.get(reservationRef);
    const shelterSnapshot = await transaction.get(shelterRef);

    if (existingReservation.exists()) {
      throw new ReservationServiceError(
        "reservation-code-collision",
        "Reservation code already exists.",
      );
    }

    if (!shelterSnapshot.exists()) {
      throw new ReservationServiceError(
        "shelter-not-found",
        "The selected shelter no longer exists.",
      );
    }

    const shelter = {
      id: shelterSnapshot.id,
      ...shelterSnapshot.data(),
    };

    if (shelter.status !== AVAILABLE_SHELTER_STATUS) {
      throw new ReservationServiceError(
        "shelter-unavailable",
        "The selected shelter is no longer available.",
      );
    }

    validateCapacityFields(shelter);
    validateLocation(
      shelter,
      "invalid-shelter-location",
      "Shelter location data is invalid.",
    );

    const reservedBefore = shelter.reserved;
    const reservedAfter = reservedBefore + peopleCount;
    const availableBefore = shelter.capacity - shelter.occupied - reservedBefore;
    const availableAfter = shelter.capacity - shelter.occupied - reservedAfter;

    if (availableBefore < peopleCount || availableAfter < 0) {
      throw new ReservationServiceError(
        "insufficient-capacity",
        "This shelter no longer has enough space for your group.",
      );
    }

    const rawDistanceKm = calculateDistanceKm(
      userLocation.latitude,
      userLocation.longitude,
      shelter.latitude,
      shelter.longitude,
    );
    const distanceKm = Number(rawDistanceKm.toFixed(2));
    const etaMinutes = calculateEvacuationEtaMinutes({
      distanceKm,
      mobilityAssistance: family.mobilityAssistance,
    });
    const {
      bufferMinutes,
      validityMinutes,
      expiresAtMs,
    } = calculateReservationExpiry({
      createdAtMs: createdAt.getTime(),
      etaMinutes,
    });
    const expiresAt = new Date(expiresAtMs);
    const expiresAtTimestamp = Timestamp.fromMillis(expiresAtMs);

    transaction.update(shelterRef, {
      reserved: reservedAfter,
    });

    transaction.set(reservationRef, {
      code,
      shelterId,
      shelterName: shelter.name,
      peopleCount,
      family,
      phone,
      status: RESERVED_STATUS,
      distanceKm,
      etaMinutes,
      bufferMinutes,
      validityMinutes,
      createdAt: serverTimestamp(),
      expiresAt: expiresAtTimestamp,
    });

    return {
      id: code,
      code,
      shelterId,
      shelterName: shelter.name,
      shelterLocation: shelter.location,
      peopleCount,
      family,
      phone,
      status: RESERVED_STATUS,
      distanceKm,
      etaMinutes,
      bufferMinutes,
      validityMinutes,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      reservedBefore,
      reservedAfter,
      availableBefore,
      availableAfter,
    };
  });
}

export async function createShelterReservation({
  shelterId,
  familyDetails,
  phone,
  userLocation,
}) {
  if (!shelterId) {
    throw new ReservationServiceError(
      "shelter-not-found",
      "A shelter is required for reservation.",
    );
  }

  validateLocation(
    userLocation,
    "invalid-user-location",
    "Citizen location is required for reservation expiry.",
  );

  const { family, peopleCount } = normalizeFamilyDetails(familyDetails);
  let lastCollision = null;

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateEvacuationCode();
    // Phase 1 uses client time to construct future expiry while Firestore
    // serverTimestamp records the canonical createdAt value.
    const createdAt = new Date();

    try {
      return await tryCreateReservation({
        code,
        shelterId,
        family,
        peopleCount,
        phone,
        createdAt,
        userLocation,
      });
    } catch (error) {
      if (error?.code === "reservation-code-collision") {
        lastCollision = error;
        continue;
      }

      console.error("Failed to create shelter reservation:", {
        code: error?.code ?? "unknown",
        message: error?.message ?? String(error),
        error,
      });
      throw error;
    }
  }

  throw (
    lastCollision ??
    new ReservationServiceError(
      "reservation-code-collision",
      "Unable to generate a unique reservation code.",
    )
  );
}
