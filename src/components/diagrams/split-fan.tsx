import { CheckIcon } from "lucide-react"
import type * as React from "react"

import { cn } from "@/lib/utils"

export type FanPhase = "idle" | "flowing" | "paid"

export interface FanLine {
  key: string
  label: string
  /** Secondary text under the label (share, tag). */
  meta?: React.ReactNode
  amount: React.ReactNode
  /** Share of the total, 0..1: drives the stroke width. */
  weight: number
}

const ROW = 56 // recipient row height (px)
const GAP = 8

/**
 * Signature moment: one payment fanning out into streams whose thickness is
 * each recipient's share. Flat orange line art, no gradients.
 */
export function SplitFan({
  source,
  lines,
  phase,
  paidLabel,
  className,
  highlightSource,
}: {
  source: React.ReactNode
  lines: FanLine[]
  phase: FanPhase
  paidLabel: string
  className?: string
  highlightSource?: boolean
}) {
  const n = Math.max(lines.length, 1)
  const height = n * ROW + (n - 1) * GAP
  const mid = height / 2

  return (
    <div
      className={cn(
        "grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-0 gap-y-3 sm:grid-cols-[minmax(0,9.5rem)_minmax(2.5rem,0.6fr)_minmax(0,1.9fr)]",
        className
      )}
    >
      <div
        className={cn(
          "col-span-2 rounded-2xl border bg-card p-4 transition-colors duration-200 sm:col-span-1",
          highlightSource && "border-primary"
        )}
      >
        {source}
      </div>

      <svg
        aria-hidden="true"
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="block w-full overflow-visible"
        style={{ height }}
      >
        {lines.map((line, i) => {
          const y = i * (ROW + GAP) + ROW / 2
          const w = 2 + Math.max(0, Math.min(1, line.weight)) * 12
          return (
            <path
              key={line.key}
              d={`M0 ${mid} C 55 ${mid}, 45 ${y}, 100 ${y}`}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={w}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className={cn(
                "transition-opacity duration-200",
                phase === "idle" ? "opacity-35" : "opacity-100",
                phase === "flowing" && "sf-flowing"
              )}
            />
          )
        })}
      </svg>

      <ol className="flex min-w-0 flex-col" style={{ gap: GAP }}>
        {lines.map((line, i) => (
          <li
            key={line.key}
            className="flex min-w-0 items-center gap-3 rounded-xl border bg-card px-3"
            style={{ height: ROW }}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-tight">{line.label}</p>
              {line.meta ? <div className="truncate text-xs text-muted-foreground">{line.meta}</div> : null}
            </div>
            <div className="shrink-0 text-right text-sm font-bold tabular-nums">{line.amount}</div>
            <span
              className={cn(
                "inline-flex size-6 shrink-0 items-center justify-center rounded-full border",
                phase === "paid" ? "sf-stamp border-success bg-success/10 text-success" : "border-dashed text-transparent"
              )}
              style={phase === "paid" ? { animationDelay: `${i * 150}ms` } : undefined}
            >
              <CheckIcon className="size-3.5" aria-hidden="true" />
              {phase === "paid" ? <span className="sr-only">{paidLabel}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
