import { CheckCircle2, MessageSquareText, Phone } from "lucide-react";

import { createShelterReservationSms } from "../../lib/sms";

export default function MockSmsNotification({ phone, reservation, shelter }) {
  const message = createShelterReservationSms({
    shelterName: shelter.name,
    peopleCount: reservation.peopleCount,
    evacuationCode: reservation.id,
  });

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <MessageSquareText size={24} aria-hidden="true" />
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
            Demo SMS Preview
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">
            Mock SMS — Prototype
          </h3>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
        <Phone size={19} className="shrink-0 text-teal-700" aria-hidden="true" />
        <div>
          <p className="text-sm text-slate-500">Sent to</p>
          <p className="font-semibold text-slate-900">{phone}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-slate-700">
          {message}
        </pre>
      </div>

      <div className="mt-5 flex items-center gap-3 text-teal-700">
        <CheckCircle2 size={20} aria-hidden="true" />
        <p className="font-semibold">Preview generated successfully</p>
      </div>
    </section>
  );
}
