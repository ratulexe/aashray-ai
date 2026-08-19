import { doc, getDoc, setDoc } from "firebase/firestore";

import { shelters } from "../data/shelters";
import { db } from "../lib/firebase";

const computedShelterFields = [
  "distanceKm",
  "availableCapacity",
  "suitabilityScore",
  "scoreBreakdown",
];

function validateShelterForSeed(shelter) {
  if (!shelter || typeof shelter !== "object" || Array.isArray(shelter)) {
    throw new Error("Shelter seed entry must be a plain object.");
  }

  if (typeof shelter.id !== "string" || shelter.id.trim() === "") {
    throw new Error("Shelter seed entry has an invalid document id.");
  }

  const missingFields = [
    "id",
    "name",
    "location",
    "latitude",
    "longitude",
    "capacity",
    "occupied",
    "reserved",
    "cycloneSafe",
    "floodSafe",
    "safetyScore",
    "accessible",
    "routeAccessible",
    "facilities",
    "status",
  ].filter((field) => shelter[field] === undefined);

  if (missingFields.length > 0) {
    throw new Error(
      `Shelter ${shelter.id ?? "unknown"} is missing: ${missingFields.join(", ")}`,
    );
  }

  const computedField = computedShelterFields.find((field) => field in shelter);

  if (computedField) {
    throw new Error(
      `Shelter ${shelter.id} contains computed field "${computedField}" and was not seeded.`,
    );
  }

  assertFirestoreSerializable(shelter, `shelters/${shelter.id}`);
}

function assertFirestoreSerializable(value, path) {
  if (value === undefined) {
    throw new Error(`${path} contains undefined, which Firestore cannot store.`);
  }

  if (value === null) {
    return;
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error(`${path} contains a non-finite number.`);
  }

  if (
    typeof value === "function" ||
    typeof value === "symbol" ||
    typeof value === "bigint"
  ) {
    throw new Error(`${path} contains an unsupported ${typeof value} value.`);
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      assertFirestoreSerializable(entry, `${path}[${index}]`);
    });
    return;
  }

  if (typeof value === "object") {
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      throw new Error(`${path} contains a non-plain object.`);
    }

    Object.entries(value).forEach(([key, entry]) => {
      assertFirestoreSerializable(entry, `${path}.${key}`);
    });
  }
}

function validateShelterDataset() {
  if (!Array.isArray(shelters) || shelters.length === 0) {
    throw new Error("Shelter seed data is missing or empty.");
  }

  const seenIds = new Set();

  for (const shelter of shelters) {
    validateShelterForSeed(shelter);

    if (seenIds.has(shelter.id)) {
      throw new Error(`Duplicate shelter document id: ${shelter.id}`);
    }

    seenIds.add(shelter.id);
  }
}

function logFirebaseError(context, error) {
  console.error(context, {
    code: error?.code ?? "unknown",
    message: error?.message ?? String(error),
    error,
  });
}

export async function seedShelters() {
  validateShelterDataset();

  try {
    const seededIds = [];

    for (const shelter of shelters) {
      await setDoc(doc(db, "shelters", shelter.id), shelter);
      seededIds.push(shelter.id);
    }

    console.log(
      `Successfully seeded ${shelters.length} shelters into Firestore.`,
    );

    return {
      seededCount: shelters.length,
      seededIds,
    };
  } catch (error) {
    logFirebaseError("Failed to seed shelters", error);
    throw error;
  }
}

export async function verifySeededShelters() {
  validateShelterDataset();

  try {
    const missingIds = [];
    const verifiedIds = [];

    for (const shelter of shelters) {
      const snapshot = await getDoc(doc(db, "shelters", shelter.id));

      if (!snapshot.exists()) {
        missingIds.push(shelter.id);
      } else {
        verifiedIds.push(shelter.id);
      }
    }

    if (missingIds.length > 0) {
      throw new Error(`Missing shelter documents: ${missingIds.join(", ")}`);
    }

    console.log(
      `Verified ${verifiedIds.length} shelter documents in Firestore.`,
    );

    return {
      verifiedCount: verifiedIds.length,
      verifiedIds,
    };
  } catch (error) {
    logFirebaseError("Failed to verify shelter seed", error);
    throw error;
  }
}
