import { Pill } from 'lucide-react'

function Field({ label, value, className = '' }) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm leading-snug text-slate-800">
        {value ?? (
          <span className="italic text-slate-400">
            Not recorded in the structured record
          </span>
        )}
      </dd>
    </div>
  )
}

/**
 * Structured medicine record card. Every value comes from the verified
 * record; missing fields render as "Not recorded in the structured record"
 * (the leaflet may still discuss them in the chat answer).
 * Multiple formulations are rendered as separate cards, never merged.
 * ``demo`` marks mock-mode records as "Demo record"; live backend
 * records render as "Verified record".
 */
export default function MedicineCard({ medicine, demo = false }) {
  if (!medicine) return null

  return (
    <article className="mt-3 overflow-hidden rounded-xl border border-white/70 bg-white/65 shadow-sm backdrop-blur-md">
      <header className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-emerald-600 px-4 py-2.5 text-white">
        <Pill className="h-4 w-4 shrink-0" aria-hidden="true" />
        <h4 className="min-w-0 flex-1 truncate text-sm font-semibold">
          {medicine.brand}
        </h4>
        <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
          {demo ? 'Demo record' : 'Verified record'}
        </span>
      </header>

      <dl className="grid grid-cols-1 gap-x-5 gap-y-3 px-4 py-3.5 sm:grid-cols-2">
        <Field label="Brand" value={medicine.brand} />
        <Field label="Generic name" value={medicine.genericName} />
        <Field
          label="Active ingredients"
          value={
            Array.isArray(medicine.activeIngredients) &&
            medicine.activeIngredients.length
              ? medicine.activeIngredients.join(' + ')
              : null
          }
        />
        <Field label="Strength" value={medicine.strength} />
        <Field label="Dosage form" value={medicine.dosageForm} />
        <Field label="FDA registration no." value={medicine.registrationNumber} />
        <Field label="Manufacturer" value={medicine.manufacturer} />
        <Field
          label="Pharmacologic category"
          value={medicine.pharmacologicCategory}
        />
        <Field
          label="Documented indications"
          value={medicine.indications}
          className="sm:col-span-2"
        />
      </dl>
    </article>
  )
}
