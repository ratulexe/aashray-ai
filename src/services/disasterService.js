import { doc, getDoc } from "firebase/firestore";

import { db } from "../lib/firebase";

function isOfflineFirestoreError(error) {
  return (
    error?.code === "unavailable" ||
    String(error?.message ?? "").toLowerCase().includes("client is offline")
  );
}

export async function getDisasterById(disasterId) {
  try {
    const ref = doc(db, "disasters", disasterId);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    };
  } catch (error) {
    const log = isOfflineFirestoreError(error) ? console.warn : console.error;
    log("Failed to load disaster:", {
      code: error?.code ?? "unknown",
      message: error?.message ?? String(error),
    });
    throw error;
  }
}

export async function getActiveDemoDisaster() {
  const disaster = await getDisasterById("D001");

  if (!disaster || disaster.status !== "ACTIVE") {
    return null;
  }

  return disaster;
}
