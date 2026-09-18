interface LogoProps {
  size?: number
  withWordmark?: boolean
  className?: string
  wordmarkColor?: string
}

/** Símbolo da marca (recriado do AppSidebar.dc.html) + wordmark opcional. */
export function Logo({ size = 32, withWordmark = false, className, wordmarkColor }: LogoProps) {
  const inner = Math.round(size * 0.625)
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <div
        className="flex shrink-0 items-center justify-center"
        style={{
          width: size,
          height: size,
          borderRadius: 9,
          background: 'linear-gradient(150deg,#2F6BD4,#033B85)',
        }}
      >
        <svg viewBox="0 0 48 48" width={inner} height={inner} fill="none">
          <rect x="6" y="37" width="36" height="5.6" rx="2.8" fill="#fff" />
          <rect x="11" y="29" width="7.6" height="9" rx="2" fill="#fff" />
          <rect x="20.2" y="23" width="7.6" height="15" rx="2" fill="#fff" />
          <rect x="29.4" y="18" width="7.6" height="20" rx="2" fill="#fff" />
          <path
            d="M9.5 25.5 L18 17.5 L24 21.5 L34.5 10.8"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M28 10.8 H34.7 V17.3"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {withWordmark && (
        <span
          className="whitespace-nowrap text-[16px] font-extrabold tracking-tightest"
          style={{ color: wordmarkColor ?? 'var(--text-1)' }}
        >
          MoneyControl
        </span>
      )}
    </div>
  )
}
