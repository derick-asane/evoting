/**
 * Hero illustration.
 *
 * Draws the thing the product actually does rather than generic ornament: a
 * ballot splits into two records — a check-in that names the voter, and a
 * sealed ballot that names only a choice — which land in separate chained
 * blocks. Decorative, so it is hidden from assistive tech; the same idea is
 * written out in the guarantees section.
 */
export function BallotHero({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 420 380"
        fill="none"
        className="w-full drop-shadow-[0_18px_40px_rgba(14,20,32,0.10)]"
      >
        <defs>
          <linearGradient id="slip" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--surface)" />
            <stop offset="100%" stopColor="var(--surface-muted)" />
          </linearGradient>
          <linearGradient id="chain" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.15" />
            <stop offset="50%" stopColor="var(--brand)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* The ballot being cast */}
        <g>
          <rect
            x="141"
            y="16"
            width="138"
            height="92"
            rx="12"
            fill="url(#slip)"
            stroke="var(--line-strong)"
          />
          <rect x="159" y="36" width="58" height="7" rx="3.5" fill="var(--ink-faint)" opacity="0.5" />
          <circle cx="166" cy="64" r="7" fill="none" stroke="var(--line-strong)" strokeWidth="2" />
          <circle cx="166" cy="86" r="7" fill="var(--brand)" />
          <path d="m162.8 86 2.4 2.4 4.4-4.8" stroke="var(--brand-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="182" y="60" width="74" height="7" rx="3.5" fill="var(--ink-faint)" opacity="0.35" />
          <rect x="182" y="82" width="52" height="7" rx="3.5" fill="var(--ink-faint)" opacity="0.5" />
        </g>

        {/* It splits in two */}
        <path
          d="M186 112v18c0 10-8 14-18 18l-38 16"
          stroke="var(--line-strong)"
          strokeWidth="2"
          strokeDasharray="5 5"
          strokeLinecap="round"
        />
        <path
          d="M234 112v18c0 10 8 14 18 18l38 16"
          stroke="var(--line-strong)"
          strokeWidth="2"
          strokeDasharray="5 5"
          strokeLinecap="round"
        />

        {/* Left: the check-in — names the voter, not the choice */}
        <g>
          <rect
            x="24"
            y="172"
            width="150"
            height="74"
            rx="12"
            fill="var(--surface)"
            stroke="var(--line-strong)"
          />
          <circle cx="52" cy="200" r="11" fill="var(--series-7)" opacity="0.18" />
          <circle cx="52" cy="197" r="4" fill="var(--series-7)" />
          <path d="M45 207a7 7 0 0 1 14 0" fill="var(--series-7)" />
          <rect x="72" y="192" width="76" height="6" rx="3" fill="var(--ink-faint)" opacity="0.5" />
          <rect x="72" y="204" width="48" height="6" rx="3" fill="var(--ink-faint)" opacity="0.3" />
          <text
            x="42"
            y="232"
            fontSize="10"
            fontFamily="var(--font-geist-mono), monospace"
            fill="var(--ink-faint)"
          >
            hasVoted = true
          </text>
        </g>

        {/* Right: the sealed ballot — names the choice, not the voter */}
        <g>
          <rect
            x="246"
            y="172"
            width="150"
            height="74"
            rx="12"
            fill="var(--surface)"
            stroke="var(--line-strong)"
          />
          <rect x="266" y="188" width="26" height="26" rx="7" fill="var(--series-3)" opacity="0.18" />
          <path
            d="m272.5 201 3.6 3.6 7.4-8"
            stroke="var(--series-3)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="302" y="192" width="72" height="6" rx="3" fill="var(--ink-faint)" opacity="0.5" />
          <rect x="302" y="204" width="44" height="6" rx="3" fill="var(--ink-faint)" opacity="0.3" />
          <text
            x="266"
            y="232"
            fontSize="10"
            fontFamily="var(--font-geist-mono), monospace"
            fill="var(--ink-faint)"
          >
            receipt → choice
          </text>
        </g>

        {/* Nothing joins the two halves */}
        <g opacity="0.75">
          <path d="M188 209h44" stroke="var(--line-strong)" strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round" />
          <circle cx="210" cy="209" r="13" fill="var(--page)" stroke="var(--line-strong)" strokeWidth="1.5" />
          <path d="m204.5 203.5 11 11M215.5 203.5l-11 11" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Chained into the ledger */}
        <path d="M0 300h420" stroke="url(#chain)" strokeWidth="2" />
        {[36, 132, 228, 324].map((x, index) => (
          <g key={x}>
            <rect
              x={x}
              y="278"
              width="60"
              height="44"
              rx="10"
              fill="var(--surface)"
              stroke={index === 2 ? "var(--brand)" : "var(--line-strong)"}
              strokeWidth={index === 2 ? 2 : 1}
            />
            <rect
              x={x + 12}
              y="290"
              width="36"
              height="5"
              rx="2.5"
              fill="var(--ink-faint)"
              opacity="0.4"
            />
            <rect
              x={x + 12}
              y="301"
              width="24"
              height="5"
              rx="2.5"
              fill={index === 2 ? "var(--brand)" : "var(--ink-faint)"}
              opacity={index === 2 ? 0.9 : 0.25}
            />
          </g>
        ))}

        <text
          x="210"
          y="352"
          textAnchor="middle"
          fontSize="11"
          fontFamily="var(--font-geist-sans), sans-serif"
          fill="var(--ink-faint)"
        >
          one contract per election · append only
        </text>
      </svg>
    </div>
  );
}
