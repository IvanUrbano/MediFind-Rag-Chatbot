/** Small status pill used across message and header UI. */
const STYLES = {
  demo: 'bg-amber-50 text-amber-700 border-amber-200',
  live: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-orange-50 text-orange-700 border-orange-200',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
}

export default function Badge({ variant = 'neutral', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${STYLES[variant] ?? STYLES.neutral} ${className}`}
    >
      {children}
    </span>
  )
}
