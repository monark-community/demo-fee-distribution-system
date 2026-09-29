/**
 * "Life of a payment" line art: payer -> split contract -> checks -> recipients.
 * Flat orange strokes, rounded caps, drawn in code (brand guidelines §6).
 */
export function LifecycleDiagram({
  label,
  payer,
  contract,
  checks,
  recipients,
}: {
  label: string
  payer: string
  contract: string
  checks: string
  recipients: string
}) {
  const ys = [34, 78, 122, 166]
  return (
    <figure className="w-full">
      <svg viewBox="0 0 720 200" role="img" aria-label={label} className="h-auto w-full text-foreground">
        {/* payer */}
        <rect x="8" y="76" width="120" height="48" rx="24" fill="var(--card)" stroke="var(--input)" strokeWidth="1.5" />
        <text x="68" y="105" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor">
          {payer}
        </text>
        <line x1="128" y1="100" x2="236" y2="100" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="182" cy="100" r="5" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
        {/* contract */}
        <rect x="236" y="62" width="160" height="76" rx="18" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
        <text x="316" y="96" textAnchor="middle" fontSize="15" fontWeight="800" fill="currentColor">
          {contract}
        </text>
        <text x="316" y="118" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
          {checks}
        </text>
        {/* fan */}
        {ys.map((y, i) => (
          <path
            key={y}
            d={`M396 100 C 470 100, 470 ${y}, 560 ${y}`}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={[5, 4, 3, 2][i]}
            strokeLinecap="round"
          />
        ))}
        {ys.map((y) => (
          <circle key={`d${y}`} cx="572" cy={y} r="10" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
        ))}
        <text x="596" y="105" fontSize="15" fontWeight="700" fill="currentColor">
          {recipients}
        </text>
      </svg>
    </figure>
  )
}
