import { collection, getDocs } from "firebase/firestore";

import { db } from "../lib/firebase";

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
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

export async function getShelters() {
  try {
    const snapshot = await getDocs(collection(db, "shelters"));

    return snapshot.docs
      .map((document) => ({
        ...document.data(),
        id: document.id,
      }))
      .filter((shelter) => {
        const usable = isUsableShelter(shelter);

        if (!usable && import.meta.env.DEV) {
          console.warn("Skipping malformed shelter document:", shelter.id, shelter);
        }

        return usable;
      });
  } catch (error) {
    console.error("Failed to load shelters:", error);
    throw error;
  }
}
