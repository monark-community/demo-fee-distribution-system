"use client"

import { CheckCircle2Icon, PencilLineIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ShareBar, ShareDot } from "@/components/diagrams/share-bar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { t } from "@/i18n/t"
import { useTx } from "@/lib/demo/chain"
import { updateShares } from "@/lib/demo/ops"
import { youSigner } from "@/lib/demo/seed"
import { updateSplit } from "@/lib/demo/store"
import type { Split } from "@/lib/demo/types"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import { useAppCopy } from "./app-provider"
import { TxFeedback } from "./tx-feedback"

const toInput = (share: number, rule: Split["rule"]) => (rule === "fixed" ? String(Number((share / 100).toFixed(2))) : String(share))
const toWeight = (v: string, rule: Split["rule"]) => {
  const n = Number(v.replace(",", "."))
  if (!Number.isFinite(n) || n <= 0) return 0
  return rule === "fixed" ? Math.round(n * 100) : Math.round(n)
}

/** "Update the points, the split follows": edit shares, recorded in the audit log. */
export function SharesDialog({ split, disabled }: { split: Split; disabled?: boolean }) {
  const { app, seed, locale } = useAppCopy()
  const sh = app.split.shares
  const c = app.composer
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const tx = useTx()

  const weights = split.recipients.map((r) => toWeight(values[r.id] ?? toInput(r.share, split.rule), split.rule))
  const total = weights.reduce((a, b) => a + b, 0)
  const valid = weights.every((w) => w > 0) && (split.rule === "points" || total === 10000)

  async function save() {
    if (!valid) return
    const you = youSigner(seed)
    const ok = await tx.run({ title: t(app.summaries.shares, { name: split.name }), movesValue: false }, (hash) => {
      updateSplit(split.id, (s) =>
        updateShares(
          s,
          s.recipients.map((r, i) => ({ ...r, share: weights[i] ?? r.share })),
          { at: new Date().toISOString(), hash, actor: you.name, actorAddress: you.address }
        )
      )
    })
    if (ok) {
      toast.success(sh.saved)
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
        if (o) setValues(Object.fromEntries(split.recipients.map((r) => [r.id, toInput(r.share, split.rule)])))
        else tx.reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <PencilLineIcon aria-hidden="true" />
          {app.split.actions.editShares}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={app.close} className="sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-extrabold">{sh.title}</DialogTitle>
          <DialogDescription>{sh.body}</DialogDescription>
        </DialogHeader>
        <ShareBar
          segments={split.recipients.map((r, i) => ({ key: r.id, label: r.label, value: split.rule === "fixed" ? (weights[i] ?? 0) / 10000 : total ? (weights[i] ?? 0) / total : 0 }))}
          unallocated={split.rule === "fixed" ? Math.max(0, 1 - total / 10000) : 0}
        />
        <p
          aria-live="polite"
          className={cn(
            "flex items-center gap-1.5 text-sm font-semibold",
            split.rule === "points" ? "text-muted-foreground" : total === 10000 ? "text-success" : total < 10000 ? "text-warning" : "text-destructive"
          )}
        >
          {split.rule === "fixed" && total === 10000 ? <CheckCircle2Icon className="size-4" aria-hidden="true" /> : null}
          {split.rule === "points"
            ? t(c.pointsTotal, { value: formatNumber(total, locale) })
            : total === 10000
              ? c.ready
              : total < 10000
                ? t(c.unallocated, { value: formatNumber((10000 - total) / 100, locale) })
                : t(c.over, { value: formatNumber((total - 10000) / 100, locale) })}
        </p>
        <ul className="flex flex-col gap-2">
          {split.recipients.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3">
              <ShareDot index={i} />
              <label htmlFor={`share-${r.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold">
                {r.label}
              </label>
              <Input
                id={`share-${r.id}`}
                inputMode={split.rule === "fixed" ? "decimal" : "numeric"}
                className="w-24 text-right tabular-nums"
                value={values[r.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [r.id]: e.target.value }))}
                aria-invalid={(weights[i] ?? 0) <= 0}
              />
              <span className="w-4 text-xs text-muted-foreground">{split.rule === "fixed" ? "%" : ""}</span>
            </li>
          ))}
        </ul>
        <TxFeedback state={tx.state} onRetry={() => void save()} onDismiss={tx.reset} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" size="lg" onClick={() => setOpen(false)} disabled={tx.busy}>
            {app.controls.cancel}
          </Button>
          <Button size="lg" onClick={() => void save()} disabled={!valid || tx.busy}>
            {sh.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
