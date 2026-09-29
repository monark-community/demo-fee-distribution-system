"use client"

import { ArrowDownLeftIcon } from "lucide-react"
import { useId, useState } from "react"

import { ShareDot } from "@/components/diagrams/share-bar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { t } from "@/i18n/t"
import { allocate } from "@/lib/demo/allocate"
import { useTx } from "@/lib/demo/chain"
import { seededAddress } from "@/lib/demo/ids"
import { needsApproval } from "@/lib/demo/ops"
import { parseUnits, TOKENS } from "@/lib/demo/tokens"
import type { Split } from "@/lib/demo/types"
import { formatToken } from "@/lib/format"
import { cn } from "@/lib/utils"

import { useAppCopy } from "./app-provider"
import { Disclaimer } from "./disclaimer"
import { TxFeedback } from "./tx-feedback"

const DEFAULT_AMOUNT: Record<Split["token"], string> = { tUSDC: "1200", tDAI: "860", tETH: "0.75" }

/** Flow 3, step 1: someone pays the split. Preview first, then a simulated transfer. */
export function SimulateDialog({
  split,
  onSend,
  disabled,
}: {
  split: Split
  /** Applies the payment; returns true when it was also auto-distributed. */
  onSend: (amount: string, payer: { name: string; address: string }, hash: string) => void
  disabled?: boolean
}) {
  const { app, locale, disclaimer } = useAppCopy()
  const s = app.split.simulate
  const uid = useId()
  const [open, setOpen] = useState(false)
  const [payerIdx, setPayerIdx] = useState(0)
  const [amount, setAmount] = useState(DEFAULT_AMOUNT[split.token])
  const tx = useTx()
  const token = TOKENS[split.token]
  const units = parseUnits(amount, token.decimals)
  const validAmount = !!units && units > 0n
  const lines = validAmount ? allocate(units!, split) : []
  const payer = s.payers[payerIdx] ?? s.payers[0] ?? ""
  const frozen = split.status === "frozen"
  const approvalNeeded = validAmount && !frozen && needsApproval(split, BigInt(split.balance) + units!)

  async function send() {
    if (!validAmount) return
    const amt = units!.toString()
    const ok = await tx.run(
      {
        title: t(app.summaries.pay, { amount: formatToken(amt, split.token, locale), name: split.name }),
        rows: [{ label: app.summaries.payAs, value: payer }],
        movesValue: true,
      },
      (hash) => onSend(amt, { name: payer.replace(/\s*\(.*\)$/, ""), address: seededAddress(`payer:${payer}`) }, hash)
    )
    if (ok) {
      setOpen(false)
      tx.reset()
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (tx.busy) return
        setOpen(o)
        if (!o) tx.reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg" disabled={disabled}>
          <ArrowDownLeftIcon aria-hidden="true" />
          {app.split.actions.simulate}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={app.close} className="sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-extrabold">{s.title}</DialogTitle>
          <DialogDescription>{s.body}</DialogDescription>
        </DialogHeader>

        <fieldset>
          <legend className="text-sm font-semibold">{s.from}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {s.payers.map((p, i) => (
              <label
                key={p}
                className={cn(
                  "inline-flex min-h-9 cursor-pointer items-center rounded-full border px-3.5 py-1 text-sm font-semibold transition-colors duration-150 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                  i === payerIdx ? "border-foreground bg-foreground text-background" : "border-input hover:bg-muted"
                )}
              >
                <input type="radio" className="sr-only" name={`${uid}-payer`} checked={i === payerIdx} onChange={() => setPayerIdx(i)} />
                {p}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <Label htmlFor={`${uid}-amount`} className="text-sm font-semibold">
            {s.amount} ({split.token})
          </Label>
          <Input
            id={`${uid}-amount`}
            inputMode="decimal"
            className="mt-2 text-lg font-bold tabular-nums"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={!validAmount}
            aria-describedby={!validAmount ? `${uid}-amount-err` : undefined}
          />
          {!validAmount ? (
            <p id={`${uid}-amount-err`} className="mt-1.5 text-xs font-semibold text-destructive">
              {app.composer.errors.amount}
            </p>
          ) : null}
        </div>

        <div>
          <p className="text-sm font-semibold">{s.preview}</p>
          {frozen ? <p className="mt-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">{s.previewHeld}</p> : null}
          {approvalNeeded && split.approval ? (
            <p className="mt-2 rounded-xl border p-3 text-sm">
              {t(s.previewApproval, { required: split.approval.required, amount: formatToken(split.approval.threshold, split.token, locale) })}
            </p>
          ) : null}
          <ul className="mt-2 divide-y rounded-xl border text-sm">
            {lines.map((line) => {
              const idx = split.recipients.findIndex((r) => r.id === line.key)
              return (
                <li key={line.key} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    {line.cover ? <span className="size-2.5 shrink-0 rounded-full border border-foreground/40" aria-hidden="true" /> : <ShareDot index={idx} />}
                    <span className="truncate">{line.label}</span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">{formatToken(line.amount, split.token, locale)}</span>
                </li>
              )
            })}
          </ul>
        </div>

        <TxFeedback state={tx.state} onRetry={() => void send()} onDismiss={tx.reset} />
        <Disclaimer text={disclaimer} />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" size="lg" onClick={() => setOpen(false)} disabled={tx.busy}>
            {s.cancel}
          </Button>
          <Button size="lg" onClick={() => void send()} disabled={!validAmount || tx.busy}>
            {s.send}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
