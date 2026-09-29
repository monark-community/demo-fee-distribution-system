import type { AllocationLine, CoverFirst, Recipient, RuleKind } from "./types"

export interface AllocationInput {
  rule: RuleKind
  recipients: Pick<Recipient, "id" | "label" | "address" | "share">[]
  coverFirst: CoverFirst | null
}

/**
 * Split `amount` (base units) the way the contract would:
 * 1. the cover-first amount comes off the top (capped at what is available);
 * 2. the rest is divided by weight (basis points or points), rounding down;
 * 3. the indivisible leftover ("rounding dust") goes to the largest share.
 * The lines always sum exactly to `amount`.
 */
export function allocate(amount: bigint, input: AllocationInput): AllocationLine[] {
  const lines: AllocationLine[] = []
  let rest = amount < 0n ? 0n : amount

  if (input.coverFirst) {
    const want = BigInt(input.coverFirst.amount || "0")
    const cover = want < rest ? want : rest
    lines.push({
      key: "cover",
      label: input.coverFirst.label,
      address: input.coverFirst.address,
      amount: cover.toString(),
      cover: true,
    })
    rest -= cover
  }

  const weighted = input.recipients.filter((r) => r.share > 0)
  const total = weighted.reduce((sum, r) => sum + BigInt(Math.round(r.share)), 0n)
  if (total === 0n || weighted.length === 0) {
    for (const r of input.recipients) {
      lines.push({ key: r.id, label: r.label, address: r.address, amount: "0" })
    }
    return lines
  }

  let assigned = 0n
  const parts = input.recipients.map((r) => {
    const w = BigInt(Math.max(0, Math.round(r.share)))
    const part = (rest * w) / total
    assigned += part
    return { r, part, w }
  })
  const dust = rest - assigned
  let largest = parts[0]
  for (const p of parts) if (largest && p.w > largest.w) largest = p

  for (const p of parts) {
    const isDustTaker = dust > 0n && p === largest
    lines.push({
      key: p.r.id,
      label: p.r.label,
      address: p.r.address,
      amount: (p.part + (isDustTaker ? dust : 0n)).toString(),
      ...(isDustTaker ? { dust: dust.toString() } : {}),
    })
  }
  return lines
}

/** Share of a recipient as a fraction 0..1 of the rule total (ignores cover-first). */
export function shareFraction(share: number, recipients: { share: number }[]): number {
  const total = recipients.reduce((s, r) => s + Math.max(0, r.share), 0)
  return total > 0 ? Math.max(0, share) / total : 0
}

export function ruleTotal(recipients: { share: number }[]): number {
  return recipients.reduce((s, r) => s + Math.max(0, r.share), 0)
}
