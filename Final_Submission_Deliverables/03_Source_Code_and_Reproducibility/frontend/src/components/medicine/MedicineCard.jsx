function Field({ label, value, className = '' }) {
  return (
    <div className={className}>
      <dt className="font-mono text-[8.5px] font-medium uppercase tracking-[0.13em] text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-[12.5px] leading-6 text-ink">
        {value ?? (
          <span className="italic text-muted/70">
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
    <article className="mt-4 border border-l-2 border-line border-l-brass-400 bg-paper-2">
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h4 className="truncate font-serif text-[16px] font-medium text-ink">
            {medicine.brand}
          </h4>
          <p className="mt-0.5 truncate font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted">
            {medicine.registrationNumber || 'No registration recorded'}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 pt-0.5 font-mono text-[8.5px] font-medium uppercase tracking-[0.12em] text-brand-700">
          <span className="h-1 w-1 bg-brass-500" aria-hidden="true" />
          {demo ? 'Demo record' : 'Verified record'}
        </span>
      </header>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 px-4 py-4 sm:grid-cols-2">
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
