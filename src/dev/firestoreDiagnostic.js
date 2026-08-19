import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { db, firebaseApp, firestoreDatabaseId } from "../lib/firebase";

const diagnosticShelterId = "seed-diagnostic";

export function getFirebaseIdentity() {
  return {
    projectId: firebaseApp.options.projectId ?? "not configured",
    databaseId: firestoreDatabaseId,
    environment: import.meta.env.MODE,
  };
}

function firebaseErrorDetails(error) {
  return {
    code: error?.code ?? "unknown",
    message: error?.message ?? String(error),
  };
}

function passed(extra = {}) {
  return {
    status: "passed",
    ...extra,
  };
}

function failed(error) {
  return {
    status: "failed",
    error: firebaseErrorDetails(error),
  };
}

export async function runFirestoreDiagnostic({ includeShelterWrite = false } = {}) {
  const result = {
    identity: getFirebaseIdentity(),
    initialization: passed(),
    readTest: {
      status: "pending",
      path: "disasters/D001",
    },
    shelterWriteTest: {
      status: includeShelterWrite ? "pending" : "skipped",
      path: `shelters/${diagnosticShelterId}`,
    },
  };

  try {
    const snapshot = await getDoc(doc(db, "disasters", "D001"));
    result.readTest = passed({
      path: "disasters/D001",
      documentExists: snapshot.exists(),
    });
  } catch (error) {
    result.readTest = {
      ...failed(error),
      path: "disasters/D001",
    };
    console.error("Firestore diagnostic read failed", {
      code: error?.code ?? "unknown",
      message: error?.message ?? String(error),
      error,
    });
  }

  if (!includeShelterWrite) {
    return result;
  }

  const diagnosticRef = doc(db, "shelters", diagnosticShelterId);

  try {
    await setDoc(diagnosticRef, {
      id: diagnosticShelterId,
      diagnostic: true,
      createdAt: serverTimestamp(),
    });

    await deleteDoc(diagnosticRef);

    result.shelterWriteTest = passed({
      path: `shelters/${diagnosticShelterId}`,
      cleanup: "deleted",
    });
  } catch (error) {
    result.shelterWriteTest = {
      ...failed(error),
      path: `shelters/${diagnosticShelterId}`,
    };
    console.error("Firestore diagnostic shelter write failed", {
      code: error?.code ?? "unknown",
      message: error?.message ?? String(error),
      error,
    });
  }

  return result;
}
