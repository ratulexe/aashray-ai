import { collection, doc, getDoc, getDocs } from "firebase/firestore";

import { db } from "../lib/firebase";

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isOfflineFirestoreError(error) {
  return (
    error?.code === "unavailable" ||
    String(error?.message ?? "").toLowerCase().includes("client is offline")
  );
}

function logFirestoreReadFailure(message, error) {
  if (isOfflineFirestoreError(error)) {
    return;
  }

  console.error(message, {
    code: error?.code ?? "unknown",
    message: error?.message ?? String(error),
  });
}

function isUsableShelter(shelter) {
  return (
    typeof shelter.id === "string" &&
    shelter.id.trim() !== "" &&
    typeof shelter.name === "string" &&
    shelter.name.trim() !== "" &&
    isFiniteNumber(shelter.latitude) &&
    isFiniteNumber(shelter.longitude) &&
    isFiniteNumber(shelter.capacity) &&
    isFiniteNumber(shelter.occupied) &&
    isFiniteNumber(shelter.reserved) &&
    isFiniteNumber(shelter.safetyScore) &&
    typeof shelter.cycloneSafe === "boolean" &&
    typeof shelter.floodSafe === "boolean" &&
    typeof shelter.accessible === "boolean" &&
    typeof shelter.routeAccessible === "boolean" &&
    Array.isArray(shelter.facilities) &&
    typeof shelter.status === "string" &&
    shelter.status.trim() !== ""
  );
}

function toShelter(document) {
  return {
    ...document.data(),
    id: document.id,
  };
}

export async function getShelterById(shelterId) {
  if (typeof shelterId !== "string" || shelterId.trim() === "") {
    throw new Error("A shelter id is required.");
  }

  try {
    const snapshot = await getDoc(doc(db, "shelters", shelterId.trim()));

    if (!snapshot.exists()) {
      return null;
    }

    const shelter = toShelter(snapshot);

    if (!isUsableShelter(shelter)) {
      if (import.meta.env.DEV) {
        console.warn("Malformed shelter document:", shelter.id, shelter);
      }

      throw new Error("Shelter data is incomplete or invalid.");
    }

    return shelter;
  } catch (error) {
    logFirestoreReadFailure(`Failed to load shelter ${shelterId}:`, error);
    throw error;
  }
}

export async function getShelters() {
  try {
    const snapshot = await getDocs(collection(db, "shelters"));

    return snapshot.docs
      .map(toShelter)
      .filter((shelter) => {
        const usable = isUsableShelter(shelter);

        if (!usable && import.meta.env.DEV) {
          console.warn("Skipping malformed shelter document:", shelter.id, shelter);
        }

        return usable;
      });
  } catch (error) {
    logFirestoreReadFailure("Failed to load shelters:", error);
    throw error;
  }
}
