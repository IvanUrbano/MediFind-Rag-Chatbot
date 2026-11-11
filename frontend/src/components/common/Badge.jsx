const STYLES = {
  demo: 'border-amber-700/25 bg-amber-50 text-amber-900',
  live: 'border-brand-700/20 bg-brand-50 text-brand-800',
  warning: 'border-orange-700/25 bg-orange-50 text-orange-900',
  neutral: 'border-line bg-transparent text-muted',
  danger: 'border-red-700/25 bg-red-50 text-red-800',
}

export default function Badge({ variant = 'neutral', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[4px] border px-1.5 py-0.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.08em] ${STYLES[variant] ?? STYLES.neutral} ${className}`}
    >
      {children}
    </span>
  )
}
