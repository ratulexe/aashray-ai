import { doc, getDoc } from "firebase/firestore";

import { db } from "../lib/firebase";

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
    console.error("Failed to load disaster:", error);
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
