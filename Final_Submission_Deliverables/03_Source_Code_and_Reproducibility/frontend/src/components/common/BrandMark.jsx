export default function BrandMark({ className = 'h-8 w-8', title }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
      focusable="false"
    >
      <rect x="1" y="1" width="46" height="46" rx="11" fill="#233129" stroke="#42564b" strokeWidth="1.5" />
      <path
        fill="#f4f1e9"
        d="M14.5 13h19c2.49 0 4.5 2.01 4.5 4.5v10c0 2.49-2.01 4.5-4.5 4.5h-10L16 38v-6h-1.5c-2.49 0-4.5-2.01-4.5-4.5v-10C10 15.01 12.01 13 14.5 13Z"
      />
      <path
        stroke="#a98d58"
        strokeWidth="3.2"
        strokeLinecap="square"
        d="M24 18.1v9.8M19.1 23h9.8"
      />
    </svg>
  )
}
