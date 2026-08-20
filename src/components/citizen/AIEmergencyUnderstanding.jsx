import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Edit3,
  LoaderCircle,
  MessageSquareText,
  PencilLine,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";

import { understandEmergency } from "../../services/aiEmergencyService";

const exampleMessage =
  "Water entered our house. We are 5 people, 2 children and my grandmother cannot walk properly.";

const incidentLabels = {
  FLOODING: "Flooding",
  CYCLONE: "Cyclone",
  MEDICAL: "Medical",
  TRAPPED: "Trapped",
  FIRE: "Fire",
  LANDSLIDE: "Landslide",
  OTHER: "Other",
};

function displayValue(value) {
  return value === null || value === undefined ? "Needs review" : value;
}

function hasCompleteFamilyCounts(result) {
  return (
    !result.needsReview &&
    Number.isInteger(result.peopleCount) &&
    result.peopleCount > 0 &&
    Number.isInteger(result.adults) &&
    Number.isInteger(result.children) &&
    Number.isInteger(result.elderly) &&
    result.peopleCount === result.adults + result.children + result.elderly
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function AIReviewCard({ result, onEdit, onConfirm }) {
  const complete = hasCompleteFamilyCounts(result);

  return (
    <div className="mt-7 rounded-2xl border border-teal-200 bg-teal-50 p-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-teal-700" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
            AI understood
          </p>
          <p className="mt-2 leading-6 text-slate-700">
            Review these details before Aashray AI searches for a shelter.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ReviewRow
          label="Incident"
          value={incidentLabels[result.incidentType] ?? "Other"}
        />
        <ReviewRow label="People" value={displayValue(result.peopleCount)} />
        <ReviewRow label="Adults" value={displayValue(result.adults)} />
        <ReviewRow label="Children" value={displayValue(result.children)} />
        <ReviewRow label="Elderly" value={displayValue(result.elderly)} />
        <ReviewRow
          label="Mobility assistance"
          value={result.mobilityAssistance ? "Required" : "Not requested"}
        />
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Summary</p>
        <p className="mt-2 leading-6 text-slate-700">{result.summary}</p>
      </div>

      {result.needsReview && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-white p-4 text-amber-700">
          <TriangleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="m-0 text-sm leading-6">
            Some family details could not be extracted safely. Please complete
            them manually before shelter search.
          </p>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onEdit(result)}
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-teal-100"
        >
          <Edit3 size={18} aria-hidden="true" />
          {complete ? "Edit Details" : "Complete Details Manually"}
        </button>

        <button
          type="button"
          onClick={() => onConfirm(result)}
          disabled={!complete}
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <CheckCircle2 size={18} aria-hidden="true" />
          Confirm & Continue
        </button>
      </div>
    </div>
  );
}

export default function AIEmergencyUnderstanding({
  onBack,
  onManual,
  onConfirm,
  onEdit,
}) {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const isLoading = status === "loading";

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setErrorMessage("Please describe what is happening, or enter details manually.");
      setStatus("error");
      return;
    }

    try {
      setStatus("loading");
      setErrorMessage("");
      setResult(null);

      const aiResult = await understandEmergency(trimmedMessage);

      setResult(aiResult);
      setStatus("ready");
    } catch {
      setErrorMessage(
        "AI assistance is temporarily unavailable. You can continue by entering your family details manually.",
      );
      setStatus("error");
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center gap-2 rounded-2xl px-1 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-100"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Back to Alert
      </button>

      <div className="mt-5 flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <Bot size={30} aria-hidden="true" />
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
            AI-assisted emergency understanding
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Tell us what is happening
          </h2>

          <p className="mt-3 max-w-xl leading-7 text-slate-600">
            Aashray AI can help convert your message into family and support
            details. You can review everything before continuing.
          </p>
        </div>
      </div>

      <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            className="field-label"
            htmlFor="emergency-description"
          >
            Emergency description
          </label>
          <textarea
            id="emergency-description"
            name="emergency-description"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setErrorMessage("");
              if (status === "error") {
                setStatus("idle");
              }
            }}
            maxLength={1800}
            rows={5}
            placeholder={exampleMessage}
            disabled={isLoading}
            className="text-input min-h-36 resize-y py-3 leading-6"
            aria-describedby="emergency-description-help"
          />
          <p id="emergency-description-help" className="field-help">
            Example: {exampleMessage}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-4 font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isLoading ? (
              <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
            ) : (
              <MessageSquareText size={20} aria-hidden="true" />
            )}
            {isLoading ? "Understanding your emergency..." : "Analyse Emergency"}
          </button>

          <button
            type="button"
            onClick={onManual}
            disabled={isLoading}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <PencilLine size={20} aria-hidden="true" />
            Enter Details Manually
          </button>
        </div>
      </form>

      <p className="sr-only" aria-live="polite">
        {isLoading ? "Understanding your emergency..." : ""}
      </p>

      {errorMessage && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700" role="alert">
          <div className="flex items-start gap-3">
            <TriangleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">AI assistance is temporarily unavailable.</p>
              <p className="mt-1 text-sm leading-6">{errorMessage}</p>
              <button
                type="button"
                onClick={onManual}
                className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 focus:outline-none focus:ring-4 focus:ring-amber-100"
              >
                Continue Manually
              </button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <AIReviewCard
          result={result}
          onEdit={onEdit}
          onConfirm={onConfirm}
        />
      )}
    </section>
  );
}
