import {
  Accessibility,
  LoaderCircle,
  Route,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

const checks = [
  {
    label: "Checking disaster safety",
    icon: ShieldCheck,
  },
  {
    label: "Checking available capacity",
    icon: Users,
  },
  {
    label: "Checking accessibility",
    icon: Accessibility,
  },
  {
    label: "Checking route conditions",
    icon: Route,
  },
  {
    label: "Comparing suitable shelters",
    icon: Search,
  },
];

export default function ShelterSearchState() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
        <LoaderCircle size={30} className="animate-spin" aria-hidden="true" />
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
          Shelter Search
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Finding a Safe Shelter
        </h2>

        <p className="mt-3 leading-7 text-slate-600">
          Aashray AI is evaluating nearby evacuation shelters.
        </p>
      </div>

      <div className="mt-7 grid gap-3">
        {checks.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-teal-700">
              <Icon size={20} aria-hidden="true" />
            </div>
            <p className="font-medium text-slate-700">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
