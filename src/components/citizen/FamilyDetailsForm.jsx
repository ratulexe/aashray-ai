import { useState } from "react";
import {
  Accessibility,
  ArrowLeft,
  Baby,
  Minus,
  Plus,
  Search,
  TriangleAlert,
  UserRound,
  Users,
} from "lucide-react";

function PersonCounter({ label, description, icon: Icon, value, onDecrease, onIncrease }) {
  const labelId = `${label.toLowerCase().replace(/\s+/g, "-")}-counter-label`;

  return (
    <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <Icon size={22} aria-hidden="true" />
          </div>

          <div>
            <p id={labelId} className="font-semibold text-slate-900">
              {label}
            </p>
            {description && (
              <p className="mt-1 text-sm leading-5 text-slate-500">
                {description}
              </p>
            )}
            {value === null && (
              <p className="mt-1 text-sm font-medium leading-5 text-amber-700">
                Not provided. Set this number to continue.
              </p>
            )}
          </div>
        </div>

        <div
          className="grid grid-cols-[48px_minmax(56px,1fr)_48px] items-center gap-3 sm:w-44"
          aria-labelledby={labelId}
        >
          <button
            type="button"
            onClick={onDecrease}
            aria-label={`Decrease number of ${label.toLowerCase()}`}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-teal-100"
          >
            <Minus size={20} aria-hidden="true" />
          </button>

          <output
            className="flex h-12 items-center justify-center rounded-2xl bg-slate-50 text-xl font-bold tabular-nums text-slate-900"
            aria-live="polite"
          >
            {value === null ? "—" : value}
          </output>

          <button
            type="button"
            onClick={onIncrease}
            aria-label={`Increase number of ${label.toLowerCase()}`}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-teal-100"
          >
            <Plus size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

// A category the citizen has not stated yet is held as `null` rather than being
// defaulted to a number, so an unknown count can never be submitted as a fact.
function getInitialCount(details, key, fallback) {
  if (!details) {
    return fallback;
  }

  const value = details[key];

  return Number.isInteger(value) && value >= 0 ? value : null;
}

function stepCount(current, { minimum, direction }) {
  if (current === null) {
    return direction === "increase" ? Math.max(minimum, 1) : minimum;
  }

  return direction === "increase"
    ? Math.min(20, current + 1)
    : Math.max(minimum, current - 1);
}

export default function FamilyDetailsForm({ initialDetails, onBack, onSubmit }) {
  const [adults, setAdults] = useState(() => getInitialCount(initialDetails, "adults", 1));
  const [children, setChildren] = useState(() => getInitialCount(initialDetails, "children", 0));
  const [elderly, setElderly] = useState(() => getInitialCount(initialDetails, "elderly", 0));
  const [mobilityAssistance, setMobilityAssistance] = useState(
    initialDetails?.mobilityAssistance ?? false,
  );

  const hasUnresolvedCounts = adults === null || children === null || elderly === null;
  const totalPeople = hasUnresolvedCounts ? null : adults + children + elderly;
  const expectedTotalPeople =
    Number.isInteger(initialDetails?.expectedTotalPeople) &&
    initialDetails.expectedTotalPeople > 0
      ? initialDetails.expectedTotalPeople
      : null;
  const matchesExpectedTotal =
    expectedTotalPeople === null || totalPeople === expectedTotalPeople;
  const canSubmit = totalPeople !== null && totalPeople > 0 && matchesExpectedTotal;

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmit({
      adults,
      children,
      elderly,
      totalPeople,
      mobilityAssistance,
    });
  };

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
          <Users size={30} aria-hidden="true" />
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
            Shelter Request
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Family Details
          </h2>

          <p className="mt-3 max-w-xl leading-7 text-slate-600">
            Tell us who needs shelter so Aashray AI can prepare for a suitable
            evacuation location.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <PersonCounter
          label="Adults"
          description="People age 18 and above"
          icon={UserRound}
          value={adults}
          onDecrease={() => setAdults((current) => stepCount(current, { minimum: 1, direction: "decrease" }))}
          onIncrease={() => setAdults((current) => stepCount(current, { minimum: 1, direction: "increase" }))}
        />

        <PersonCounter
          label="Children"
          description="People under age 18"
          icon={Baby}
          value={children}
          onDecrease={() => setChildren((current) => stepCount(current, { minimum: 0, direction: "decrease" }))}
          onIncrease={() => setChildren((current) => stepCount(current, { minimum: 0, direction: "increase" }))}
        />

        <PersonCounter
          label="Elderly"
          description="Older adults who may need additional support"
          icon={UserRound}
          value={elderly}
          onDecrease={() => setElderly((current) => stepCount(current, { minimum: 0, direction: "decrease" }))}
          onIncrease={() => setElderly((current) => stepCount(current, { minimum: 0, direction: "increase" }))}
        />

        <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <Accessibility size={22} aria-hidden="true" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">Mobility Assistance</p>

              <label
                htmlFor="mobility-assistance"
                className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 p-4 text-slate-700 transition hover:bg-slate-100"
              >
                <input
                  id="mobility-assistance"
                  type="checkbox"
                  checked={mobilityAssistance}
                  onChange={(event) => setMobilityAssistance(event.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-teal-700 focus:ring-4 focus:ring-teal-100"
                />

                <span className="text-sm font-medium leading-6">
                  Does anyone need mobility assistance?
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="font-semibold text-slate-700">Total People</p>
            <output className="text-3xl font-bold tabular-nums text-slate-900">
              {totalPeople === null ? "—" : totalPeople}
            </output>
          </div>

          {expectedTotalPeople !== null && (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              AI understood {expectedTotalPeople} people in total. Assign every
              person to a category so the counts match.
            </p>
          )}
        </div>

        {hasUnresolvedCounts && (
          <div
            className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700"
            role="status"
          >
            <TriangleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="m-0 text-sm leading-6">
              Some family details are still unknown. Set every category before
              searching for a shelter.
            </p>
          </div>
        )}

        {!hasUnresolvedCounts && !matchesExpectedTotal && (
          <div
            className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700"
            role="status"
          >
            <TriangleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="m-0 text-sm leading-6">
              These counts total {totalPeople} people, but {expectedTotalPeople}{" "}
              people were described. Correct the numbers before continuing.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-4 font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:bg-slate-300"
        >
          <Search size={20} aria-hidden="true" />
          {canSubmit
            ? `Find Shelter for ${totalPeople} People`
            : "Complete Family Details"}
        </button>
      </form>
    </section>
  );
}
