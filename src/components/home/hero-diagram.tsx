"use client"

import { ArrowDownRightIcon } from "lucide-react"
import { useEffect, useState, useSyncExternalStore } from "react"

import { SplitFan, type FanPhase } from "@/components/diagrams/split-fan"
import type { Locale } from "@/i18n/config"
import { formatPercent, formatUnits } from "@/lib/format"

const TOTAL = 2500
const SHARES = [0.4, 0.3, 0.2, 0.1]

type Stage = "arriving" | FanPhase

const reducedQuery = "(prefers-reduced-motion: reduce)"
function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia(reducedQuery)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}
function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false)
}

/** Home hero: a sponsorship payment splitting into four streams, on a calm loop. */
export function HeroDiagram({
  locale,
  copy,
}: {
  locale: Locale
  copy: {
    label: string
    incoming: string
    from: string
    states: { arriving: string; flowing: string; paid: string }
    recipients: string[]
    paid: string
  }
}) {
  const reduced = usePrefersReducedMotion()
  const [stage, setStage] = useState<Stage>("paid")
  const [progress, setProgress] = useState(1)

  useEffect(() => {
    if (reduced) return
    let cancelled = false
    let raf = 0
    const timers: ReturnType<typeof setTimeout>[] = []
    const cycle = () => {
      if (cancelled) return
      setStage("arriving")
      setProgress(0)
      timers.push(
        setTimeout(() => {
          setStage("flowing")
          const start = performance.now()
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / 1800)
            setProgress(1 - Math.pow(1 - p, 3))
            if (p < 1 && !cancelled) raf = requestAnimationFrame(tick)
          }
          raf = requestAnimationFrame(tick)
        }, 1100)
      )
      timers.push(setTimeout(() => setStage("paid"), 3100))
      timers.push(setTimeout(cycle, 6600))
    }
    timers.push(setTimeout(cycle, 2600))
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
    }
  }, [reduced])

  const shown: Stage = reduced ? "paid" : stage
  const shownProgress = reduced ? 1 : progress
  const phase: FanPhase = shown === "arriving" ? "idle" : shown
  const fmt = (n: number) => formatUnits(BigInt(Math.round(n * 100)), 2, locale, 2)

  return (
    <figure aria-label={copy.label} className="relative">
      <div aria-hidden="true">
        <SplitFan
          phase={phase}
          highlightSource={shown === "arriving"}
          paidLabel={copy.paid}
          source={
            <div>
              <p className="eyebrow text-muted-foreground">{copy.incoming}</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-display">
                {fmt(TOTAL)} <span className="text-base font-bold text-muted-foreground">tUSDC</span>
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowDownRightIcon className="size-3.5" />
                {copy.from}
              </p>
            </div>
          }
          lines={copy.recipients.map((label, i) => {
            const share = SHARES[i] ?? 0
            return {
              key: label,
              label,
              meta: formatPercent(share, locale),
              weight: share / 0.4,
              amount: <span>{fmt(TOTAL * share * shownProgress)}</span>,
            }
          })}
        />
      </div>
      <figcaption className="mt-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground" aria-hidden="true">
        <span
          className={
            shown === "paid"
              ? "size-2 rounded-full bg-success"
              : "size-2 animate-pulse rounded-full bg-primary"
          }
        />
        {shown === "arriving" ? copy.states.arriving : shown === "flowing" ? copy.states.flowing : copy.states.paid}
      </figcaption>
    </figure>
  )
}
