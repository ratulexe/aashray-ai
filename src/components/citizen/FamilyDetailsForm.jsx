import { useState } from "react";
import {
  Accessibility,
  ArrowLeft,
  Baby,
  Minus,
  Plus,
  Search,
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
            {value}
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

export default function FamilyDetailsForm({ initialDetails, onBack, onSubmit }) {
  const [adults, setAdults] = useState(initialDetails?.adults ?? 1);
  const [children, setChildren] = useState(initialDetails?.children ?? 0);
  const [elderly, setElderly] = useState(initialDetails?.elderly ?? 0);
  const [mobilityAssistance, setMobilityAssistance] = useState(
    initialDetails?.mobilityAssistance ?? false,
  );

  const totalPeople = adults + children + elderly;

  const handleSubmit = (event) => {
    event.preventDefault();

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
        className="inline-flex items-center gap-2 rounded-2xl px-1 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-100"
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
          onDecrease={() => setAdults((current) => Math.max(1, current - 1))}
          onIncrease={() => setAdults((current) => Math.min(20, current + 1))}
        />

        <PersonCounter
          label="Children"
          description="People under age 18"
          icon={Baby}
          value={children}
          onDecrease={() => setChildren((current) => Math.max(0, current - 1))}
          onIncrease={() => setChildren((current) => Math.min(20, current + 1))}
        />

        <PersonCounter
          label="Elderly"
          description="Older adults who may need additional support"
          icon={UserRound}
          value={elderly}
          onDecrease={() => setElderly((current) => Math.max(0, current - 1))}
          onIncrease={() => setElderly((current) => Math.min(20, current + 1))}
        />

        <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <Accessibility size={22} aria-hidden="true" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">
                Extra Help
              </p>

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
                  Need help moving around
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="font-semibold text-slate-700">Total People</p>
            <output className="text-3xl font-bold tabular-nums text-slate-900">
              {totalPeople}
            </output>
          </div>
        </div>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-4 font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100"
        >
          <Search size={20} aria-hidden="true" />
          Find Shelter for {totalPeople} People
        </button>
      </form>
    </section>
  );
}
    
