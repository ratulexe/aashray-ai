import { doc, getDoc } from "firebase/firestore";

import { db } from "../lib/firebase";

const reservationCodePattern = /^ASH-\d{4}$/;

export const RESERVATION_VERIFICATION_STATUS = {
  VALID: "VALID",
  INVALID_CODE: "INVALID_CODE",
  NOT_FOUND: "NOT_FOUND",
  EXPIRED: "EXPIRED",
  ALREADY_ARRIVED: "ALREADY_ARRIVED",
  CANCELLED: "CANCELLED",
  WRONG_SHELTER: "WRONG_SHELTER",
  INVALID_STATUS: "INVALID_STATUS",
  INVALID_RESERVATION: "INVALID_RESERVATION",
  SYSTEM_ERROR: "SYSTEM_ERROR",
};

const reservationStatusMap = {
  RESERVED: RESERVATION_VERIFICATION_STATUS.VALID,
  ARRIVED: RESERVATION_VERIFICATION_STATUS.ALREADY_ARRIVED,
  EXPIRED: RESERVATION_VERIFICATION_STATUS.EXPIRED,
  CANCELLED: RESERVATION_VERIFICATION_STATUS.CANCELLED,
};

export function normalizeReservationCode(code) {
  return typeof code === "string" ? code.trim().toUpperCase() : "";
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isValidFamily(family, peopleCount) {
  return (
    family &&
    typeof family === "object" &&
    !Array.isArray(family) &&
    isNonNegativeInteger(family.adults) &&
    isNonNegativeInteger(family.children) &&
    isNonNegativeInteger(family.elderly) &&
    typeof family.mobilityAssistance === "boolean" &&
    family.adults + family.children + family.elderly === peopleCount
  );
}

function timestampToMillis(value) {
  if (value && typeof value.toMillis === "function") {
    const millis = value.toMillis();
    return Number.isFinite(millis) ? millis : null;
  }

  if (value instanceof Date) {
    const millis = value.getTime();
    return Number.isFinite(millis) ? millis : null;
  }

  if (typeof value === "string") {
    const millis = Date.parse(value);
    return Number.isFinite(millis) ? millis : null;
  }

  return null;
}

function warnInvalidReservation(reason, reservation) {
  if (import.meta.env.DEV) {
    console.warn("Invalid reservation document:", reason, reservation);
  }
}

function isValidReservationShape(reservation, normalizedCode) {
  if (reservation.code !== normalizedCode) {
    warnInvalidReservation("code does not match document id", reservation);
    return false;
  }

  if (
    typeof reservation.shelterId !== "string" ||
    reservation.shelterId.trim() === "" ||
    typeof reservation.shelterName !== "string" ||
    reservation.shelterName.trim() === "" ||
    !isPositiveInteger(reservation.peopleCount) ||
    !isValidFamily(reservation.family, reservation.peopleCount) ||
    typeof reservation.status !== "string" ||
    timestampToMillis(reservation.createdAt) === null ||
    timestampToMillis(reservation.expiresAt) === null
  ) {
    warnInvalidReservation("missing or malformed required fields", reservation);
    return false;
  }

  return true;
}

function invalidReservationResult(normalizedCode, reservation = null) {
  return {
    ok: false,
    status: RESERVATION_VERIFICATION_STATUS.INVALID_RESERVATION,
    code: normalizedCode,
    reservation,
  };
}

export async function verifyReservationCode(code, { expectedShelterId } = {}) {
  const normalizedCode = normalizeReservationCode(code);

  if (!reservationCodePattern.test(normalizedCode)) {
    return {
      ok: false,
      status: RESERVATION_VERIFICATION_STATUS.INVALID_CODE,
      code: normalizedCode,
    };
  }

  try {
    const reservationRef = doc(db, "reservations", normalizedCode);
    const snapshot = await getDoc(reservationRef);

    if (!snapshot.exists()) {
      return {
        ok: false,
        status: RESERVATION_VERIFICATION_STATUS.NOT_FOUND,
        code: normalizedCode,
      };
    }

    const reservation = {
      id: snapshot.id,
      ...snapshot.data(),
    };

    if (!isValidReservationShape(reservation, normalizedCode)) {
      return invalidReservationResult(normalizedCode, reservation);
    }

    const mappedStatus = reservationStatusMap[reservation.status];

    if (!mappedStatus) {
      return {
        ok: false,
        status: RESERVATION_VERIFICATION_STATUS.INVALID_STATUS,
        code: normalizedCode,
        reservation,
      };
    }

    if (mappedStatus !== RESERVATION_VERIFICATION_STATUS.VALID) {
      return {
        ok: false,
        status: mappedStatus,
        code: normalizedCode,
        reservation,
      };
    }

    if (expectedShelterId && reservation.shelterId !== expectedShelterId) {
      return {
        ok: false,
        status: RESERVATION_VERIFICATION_STATUS.WRONG_SHELTER,
        code: normalizedCode,
        reservation,
      };
    }

    const expiresAtMs = timestampToMillis(reservation.expiresAt);
    const remainingMs = expiresAtMs - Date.now();

    if (remainingMs <= 0) {
      return {
        ok: false,
        status: RESERVATION_VERIFICATION_STATUS.EXPIRED,
        code: normalizedCode,
        reservation,
        remainingMinutes: 0,
      };
    }

    return {
      ok: true,
      status: RESERVATION_VERIFICATION_STATUS.VALID,
      code: normalizedCode,
      reservation,
      remainingMinutes: Math.ceil(remainingMs / 60000),
    };
  } catch (error) {
    console.error("Failed to verify reservation code:", {
      code: error?.code ?? "unknown",
      message: error?.message ?? String(error),
      error,
    });

    return {
      ok: false,
      status: RESERVATION_VERIFICATION_STATUS.SYSTEM_ERROR,
      code: normalizedCode,
    };
  }
}
