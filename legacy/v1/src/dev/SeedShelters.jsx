import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Database,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";

import {
  getFirebaseIdentity,
  runFirestoreDiagnostic,
} from "./firestoreDiagnostic";
import { seedShelters, verifySeededShelters } from "./seedShelters";

function getFirebaseErrorMessage(error) {
  const code = error?.code ?? "unknown";
  const message = error?.message ?? "Unable to seed shelter data.";

  if (code === "permission-denied") {
    return [
      "Permission denied by Firestore.",
      "Temporarily deploy shelter write rules, seed once, then restore read-only shelter rules.",
      `Firebase error: ${code} - ${message}`,
    ].join(" ");
  }

  return `Firebase error: ${code} - ${message}`;
}

function diagnosticFailed(test) {
  return test?.status === "failed";
}

function DiagnosticRow({ label, test }) {
  const status = test?.status ?? "pending";
  const statusText = {
    failed: "Failed",
    passed: "Passed",
    pending: "Pending",
    skipped: "Skipped",
  }[status];

  const colorClass = {
    failed: "text-amber-700",
    passed: "text-teal-700",
    pending: "text-slate-500",
    skipped: "text-slate-500",
  }[status];

  return (
    <div className="border-t border-slate-100 py-3 first:border-t-0">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className={`text-sm font-semibold ${colorClass}`}>{statusText}</span>
      </div>
      {test?.path && (
        <p className="mt-1 text-xs text-slate-500">{test.path}</p>
      )}
      {status === "passed" && "documentExists" in test && (
        <p className="mt-1 text-xs text-slate-500">
          Document exists: {test.documentExists ? "yes" : "no"}
        </p>
      )}
      {test?.error && (
        <p className="mt-2 text-xs leading-5 text-amber-800">
          {test.error.code}: {test.error.message}
        </p>
      )}
    </div>
  );
}

export default function SeedShelters() {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [verifiedIds, setVerifiedIds] = useState([]);
  const [diagnostic, setDiagnostic] = useState({
    identity: getFirebaseIdentity(),
    initialization: { status: "passed" },
    readTest: { status: "pending", path: "disasters/D001" },
    shelterWriteTest: {
      status: "skipped",
      path: "shelters/seed-diagnostic",
    },
  });
  const [diagnosticStatus, setDiagnosticStatus] = useState("loading");

  const runDiagnostic = async ({ includeShelterWrite = false } = {}) => {
    setDiagnosticStatus("loading");

    const result = await runFirestoreDiagnostic({ includeShelterWrite });
    setDiagnostic(result);
    setDiagnosticStatus("idle");

    return result;
  };

  useEffect(() => {
    let isMounted = true;

    runFirestoreDiagnostic()
      .then((result) => {
        if (isMounted) {
          setDiagnostic(result);
          setDiagnosticStatus("idle");
        }
      })
      .catch((error) => {
        console.error("Firestore diagnostic failed unexpectedly", {
          code: error?.code ?? "unknown",
          message: error?.message ?? String(error),
          error,
        });

        if (isMounted) {
          setDiagnostic((current) => ({
            ...current,
            initialization: {
              status: "failed",
              error: {
                code: error?.code ?? "unknown",
                message: error?.message ?? String(error),
              },
            },
          }));
          setDiagnosticStatus("idle");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSeed = async () => {
    try {
      setStatus("loading");
      setMessage("Checking Firestore before seeding shelter data.");
      setVerifiedIds([]);

      const diagnosticResult = await runDiagnostic({ includeShelterWrite: true });

      if (diagnosticFailed(diagnosticResult.readTest)) {
        const readError = diagnosticResult.readTest.error;
        const error = new Error(readError.message);
        error.code = readError.code;
        throw error;
      }

      if (diagnosticFailed(diagnosticResult.shelterWriteTest)) {
        const writeError = diagnosticResult.shelterWriteTest.error;
        const error = new Error(writeError.message);
        error.code = writeError.code;
        throw error;
      }

      setMessage("Seeding shelter data into Firestore.");

      await seedShelters();
      const verification = await verifySeededShelters();

      setVerifiedIds(verification.verifiedIds);
      setMessage(
        `Shelter data seeded and verified. ${verification.verifiedCount} documents found.`,
      );
      setStatus("success");
    } catch (error) {
      console.error("Seed page failed", {
        code: error?.code ?? "unknown",
        message: error?.message ?? String(error),
        error,
      });
      setMessage(getFirebaseErrorMessage(error));
      setStatus("error");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <Database size={30} aria-hidden="true" />
        </div>

        <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-teal-700">
          Development Tool
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Seed Shelter Data
        </h1>

        <p className="mt-3 leading-7 text-slate-600">
          This manually writes the local shelter dataset to Firestore using each
          shelter ID as the document ID.
        </p>

        <div className="mt-6 rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">Firebase Connection</p>
              <p className="mt-1 text-sm text-slate-500">
                Project: {diagnostic.identity.projectId}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Database: {diagnostic.identity.databaseId}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Environment: {diagnostic.identity.environment}
              </p>
            </div>

            <button
              type="button"
              onClick={() => runDiagnostic()}
              disabled={diagnosticStatus === "loading" || status === "loading"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-teal-200 hover:text-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:text-slate-300"
              aria-label="Refresh Firebase diagnostics"
              title="Refresh Firebase diagnostics"
            >
              <RefreshCw
                size={18}
                className={diagnosticStatus === "loading" ? "animate-spin" : ""}
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="mt-4">
            <DiagnosticRow label="Initialization" test={diagnostic.initialization} />
            <DiagnosticRow label="Read test" test={diagnostic.readTest} />
            <DiagnosticRow
              label="Shelter write test"
              test={diagnostic.shelterWriteTest}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSeed}
          disabled={status === "loading"}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-4 font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {status === "loading" ? (
            <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
          ) : (
            <Database size={20} aria-hidden="true" />
          )}
          Seed Shelter Data
        </button>

        {message && (
          <div
            className={`mt-5 rounded-2xl border p-4 ${
              status === "error"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <div className="flex items-start gap-3">
              {status === "success" ? (
                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0 text-teal-700"
                  aria-hidden="true"
                />
              ) : status === "error" ? (
                <TriangleAlert
                  size={20}
                  className="mt-0.5 shrink-0 text-amber-700"
                  aria-hidden="true"
                />
              ) : (
                <LoaderCircle
                  size={20}
                  className="mt-0.5 shrink-0 animate-spin text-teal-700"
                  aria-hidden="true"
                />
              )}
              <p className="text-sm leading-6">{message}</p>
            </div>
          </div>
        )}

        {verifiedIds.length > 0 && (
          <div className="mt-5 rounded-2xl border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">Verified Documents</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {verifiedIds.join(", ")}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
