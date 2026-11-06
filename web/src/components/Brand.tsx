// UNZA brand emblem — a stylized academic crest (shield + open book + star) in
// the university's green & gold. This is a tasteful placeholder mark; to use the
// official University of Zambia coat of arms, drop its SVG into /public and
// swap <Emblem/> for an <Image/>.

export function Emblem({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="University of Zambia"
      role="img"
    >
      <defs>
        <linearGradient id="unza-shield" x1="24" y1="2" x2="24" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1a7a4e" />
          <stop offset="1" stopColor="#0c3f27" />
        </linearGradient>
        <linearGradient id="unza-gold" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#eccb63" />
          <stop offset="1" stopColor="#c79a2a" />
        </linearGradient>
      </defs>
      {/* Shield */}
      <path
        d="M24 2.5 L43 8.2 V23.5 C43 34.2 34.8 42.6 24 45.8 C13.2 42.6 5 34.2 5 23.5 V8.2 Z"
        fill="url(#unza-shield)"
        stroke="url(#unza-gold)"
        strokeWidth="1.6"
      />
      {/* Star */}
      <path
        d="M24 10.5 L25.6 14.4 L29.8 15 L26.6 17.9 L27.4 22 L24 19.9 L20.6 22 L21.4 17.9 L18.2 15 L22.4 14.4 Z"
        fill="url(#unza-gold)"
      />
      {/* Open book */}
      <path
        d="M24 25.2 C21.4 23.4 16.6 22.9 12.5 23.8 V34.2 C16.6 33.3 21.4 33.8 24 35.6 Z"
        fill="url(#unza-gold)"
      />
      <path
        d="M24 25.2 C26.6 23.4 31.4 22.9 35.5 23.8 V34.2 C31.4 33.3 26.6 33.8 24 35.6 Z"
        fill="#f5efe0"
      />
      <path d="M24 25.2 V35.6" stroke="#0c3f27" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Emblem size={compact ? 32 : 40} />
      <div className="leading-tight">
        <div className={compact ? "text-sm font-semibold" : "text-base font-bold tracking-tight"}>
          University of Zambia
        </div>
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--fg-muted)]">
          Data Analytics
        </div>
      </div>
    </div>
  );
}
