import { cn } from "@/lib/utils"

export const SHARE_COLORS = [
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-2)",
  "var(--chart-5)",
]

export function shareColor(index: number) {
  return SHARE_COLORS[index % SHARE_COLORS.length]
}

export interface ShareSegment {
  key: string
  label: string
  /** Fraction of the whole bar, 0..1. */
  value: number
}

/**
 * Horizontal share bar. Unallocated space is hatched until the shares reach
 * exactly 100% (signature moment: the bar "settles").
 */
export function ShareBar({
  segments,
  unallocated = 0,
  className,
  size = "md",
  label,
}: {
  segments: ShareSegment[]
  unallocated?: number
  className?: string
  size?: "sm" | "md"
  label?: string
}) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0) + Math.max(0, unallocated)
  const scale = total > 1 ? 1 / total : 1
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "flex w-full overflow-hidden rounded-full border bg-muted",
        size === "sm" ? "h-2.5" : "h-4",
        className
      )}
    >
      {segments.map((s, i) =>
        s.value > 0 ? (
          <div
            key={s.key}
            title={s.label}
            className="h-full border-r-2 border-card transition-[width] duration-200 ease-out last:border-r-0"
            style={{ width: `${s.value * scale * 100}%`, background: shareColor(i) }}
          />
        ) : null
      )}
      {unallocated > 0 ? (
        <div className="h-full text-input transition-[width] duration-200 ease-out" style={{ width: `${unallocated * scale * 100}%` }}>
          <svg className="size-full" aria-hidden="true">
            <defs>
              <pattern id="sf-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#sf-hatch)" />
          </svg>
        </div>
      ) : null}
    </div>
  )
}

export function ShareDot({ index, className }: { index: number; className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-2.5 shrink-0 rounded-full", className)} style={{ background: shareColor(index) }} />
}
