"use client"

import { ArrowLeftIcon, CheckIcon, ClockIcon, SendIcon, SnowflakeIcon, SunIcon, UserCheckIcon, ZapIcon } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { ShareDot } from "@/components/diagrams/share-bar"
import { SplitFan, type FanPhase } from "@/components/diagrams/split-fan"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { NetworkBadge } from "@/components/ui/network-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wallet, WalletAddress, WalletAvatar } from "@/components/ui/wallet"
import { href } from "@/i18n/config"
import { t } from "@/i18n/t"
import { allocate, shareFraction } from "@/lib/demo/allocate"
import { useTx } from "@/lib/demo/chain"
import { applyApproval, applyDistribution, applyPayment, approvalsMet, needsApproval, requestApproval, setFrozen } from "@/lib/demo/ops"
import { youSigner } from "@/lib/demo/seed"
import { getDemo, updateSplit, useDemo } from "@/lib/demo/store"
import { NETWORK_NAME } from "@/lib/demo/tokens"
import type { AllocationLine, Signer, Split } from "@/lib/demo/types"
import { formatDate, formatPercent, formatToken, formatUsd } from "@/lib/format"
import { usdValue } from "@/lib/demo/tokens"

import { ActivityLog } from "./activity-log"
import { useAppCopy } from "./app-provider"
import { Disclaimer } from "./disclaimer"
import { SharesDialog } from "./shares-dialog"
import { SimulateDialog } from "./simulate-dialog"
import { TxFeedback } from "./tx-feedback"

const now = () => new Date().toISOString()

export function SplitView({ id }: { id: string }) {
  const demo = useDemo()
  const { app, locale } = useAppCopy()
  const s = app.split
  const split = demo?.splits.find((x) => x.id === id)

  if (!demo) return null
  if (!split) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
        <h1 className="text-3xl font-extrabold tracking-display">{s.notFoundTitle}</h1>
        <p className="mt-3 text-muted-foreground">{s.notFoundBody}</p>
        <Button asChild className="mt-8" size="lg">
          <Link href={href(locale, "/app")}>
            <ArrowLeftIcon aria-hidden="true" />
            {s.back}
          </Link>
        </Button>
      </div>
    )
  }
  return <SplitDetail split={split} />
}

function SplitDetail({ split }: { split: Split }) {
  const { app, locale, seed, disclaimer } = useAppCopy()
  const s = app.split
  const you = youSigner(seed)
  const mainTx = useTx()
  const [phase, setPhase] = useState<FanPhase>("idle")
  const [paidLines, setPaidLines] = useState<AllocationLine[] | null>(null)
  // The last attempted action, so a failed transaction can be retried as-is.
  const [lastAction, setLastAction] = useState<(() => Promise<void>) | null>(null)
  const track = (fn: () => Promise<void>) => {
    setLastAction(() => fn)
    void fn()
  }

  // After a payout, keep the stamped receipt on screen for a moment.
  useEffect(() => {
    if (phase !== "paid") return
    const timer = setTimeout(() => {
      setPhase("idle")
      setPaidLines(null)
    }, 6000)
    return () => clearTimeout(timer)
  }, [phase])

  const frozen = split.status === "frozen"
  const balance = BigInt(split.balance)
  const approvalRequired = needsApproval(split)
  const meta = (hash: string) => ({ at: now(), hash, actor: you.name, actorAddress: you.address })

  const liveLines = paidLines ?? (balance > 0n ? allocate(split.pending ? BigInt(split.pending.amount) : balance, split) : null)
  const weightOf = (key: string) => {
    if (key === "cover") return 0.25
    const r = split.recipients.find((x) => x.id === key)
    const max = Math.max(...split.recipients.map((x) => shareFraction(x.share, split.recipients)))
    return r ? shareFraction(r.share, split.recipients) / (max || 1) : 0
  }

  const fanLines = (liveLines ?? allocate(0n, split)).map((line) => {
    const idx = split.recipients.findIndex((r) => r.id === line.key)
    const r = split.recipients[idx]
    return {
      key: line.key,
      label: line.label,
      weight: weightOf(line.key),
      meta: line.cover ? (
        <span>{s.coverTag}</span>
      ) : (
        <span className="inline-flex items-center gap-1.5">
          <ShareDot index={idx} className="size-2" />
          {r ? formatPercent(shareFraction(r.share, split.recipients), locale) : null}
          {line.dust ? <span>· {s.dustTag}</span> : null}
        </span>
      ),
      amount: liveLines ? formatToken(line.amount, split.token, locale) : <span className="text-muted-foreground">—</span>,
    }
  })

  // Flow 3: distribute what is waiting (or execute an approved payout).
  async function distribute(opts: { skipPrompt?: boolean; amount?: string } = {}) {
    const amount = opts.amount ?? split.balance
    const lines = allocate(BigInt(amount), split)
    setPaidLines(lines)
    setPhase("flowing")
    const ok = await mainTx.run(
      {
        title: t(app.summaries.distribute, { amount: formatToken(amount, split.token, locale), name: split.name }),
        rows: [{ label: app.summaries.recipients, value: String(lines.length) }],
        movesValue: true,
      },
      (hash) => updateSplit(split.id, (x) => applyDistribution(x, { ...meta(hash), amount })),
      { skipPrompt: opts.skipPrompt }
    )
    if (ok) {
      setPhase("paid")
      toast.success(t(s.toasts.distributed, { amount: formatToken(amount, split.token, locale), n: lines.length }))
    } else {
      setPhase("idle")
      setPaidLines(null)
    }
  }

  async function propose() {
    const ok = await mainTx.run(
      { title: t(app.summaries.requestApproval, { amount: formatToken(split.balance, split.token, locale) }), movesValue: true },
      (hash) => updateSplit(split.id, (x) => requestApproval(x, you, meta(hash)))
    )
    if (ok) toast.success(s.toasts.proposed)
  }

  async function approveAs(signer: Signer) {
    if (!split.pending) return
    const amount = split.pending.amount
    const willExecute = split.approval ? split.pending.approvals.length + 1 >= split.approval.required : false
    const lines = allocate(BigInt(amount), split)
    if (willExecute) {
      setPaidLines(lines)
      setPhase("flowing")
    }
    const ok = await mainTx.run(
      { title: t(app.summaries.approve, { amount: formatToken(amount, split.token, locale) }), movesValue: true },
      (hash) =>
        updateSplit(split.id, (x) => {
          let next = applyApproval(x, signer, { at: now(), hash })
          if (approvalsMet(next) && next.status === "active" && next.pending) {
            next = applyDistribution(next, { at: now(), hash, actor: signer.name, actorAddress: signer.address, amount: next.pending.amount })
          }
          return next
        }),
      { skipPrompt: true }
    )
    if (ok) {
      toast.success(t(s.toasts.approved, { name: signer.name }))
      if (willExecute) {
        setPhase("paid")
        toast.success(t(s.toasts.distributed, { amount: formatToken(amount, split.token, locale), n: lines.length }))
      }
    } else if (willExecute) {
      setPhase("idle")
      setPaidLines(null)
    }
  }

  async function toggleFreeze() {
    const freezing = !frozen
    const ok = await mainTx.run(
      { title: t(freezing ? app.summaries.freeze : app.summaries.unfreeze, { name: split.name }), movesValue: false },
      (hash) => updateSplit(split.id, (x) => setFrozen(x, freezing, meta(hash)))
    )
    if (ok) toast.success(freezing ? s.toasts.frozen : s.toasts.unfrozen)
  }

  function onPayment(amount: string, payer: { name: string; address: string }, hash: string) {
    const current = getDemo()?.splits.find((x) => x.id === split.id)
    if (!current) return
    let next = applyPayment(current, amount, { at: now(), hash, actor: payer.name, actorAddress: payer.address })
    const auto = next.autoDistribute && next.status === "active" && !next.pending && !needsApproval(next)
    if (auto) {
      const lines = allocate(BigInt(next.balance), next)
      next = applyDistribution(next, { at: now(), hash, actor: seed.automatic, actorAddress: "", auto: true })
      setPaidLines(lines)
      setPhase("paid")
      toast.success(t(s.simulate.receivedAuto, { n: lines.length }))
    } else {
      toast.success(t(s.simulate.received, { amount: formatToken(next.balance, next.token, locale) }))
    }
    updateSplit(split.id, () => next)
  }

  const busy = mainTx.busy
  const reason = frozen ? s.reasons.frozen : split.pending ? s.reasons.pending : balance === 0n ? s.reasons.empty : null

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <Link href={href(locale, "/app")} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          {s.back}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {frozen ? (
            <Badge variant="warning">
              <SnowflakeIcon aria-hidden="true" />
              {app.dashboard.frozen}
            </Badge>
          ) : (
            <Badge variant="success">{app.dashboard.active}</Badge>
          )}
          <Badge variant="outline">{app.dashboard.rule[split.rule]}</Badge>
          {split.autoDistribute ? (
            <Badge variant="outline">
              <ZapIcon aria-hidden="true" />
              {s.settings.autoOn}
            </Badge>
          ) : null}
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-display sm:text-4xl">{split.name}</h1>
        {split.purpose ? <p className="mt-2 max-w-2xl text-muted-foreground">{split.purpose}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Wallet address={split.address} size="sm" name={s.contract} copyLabel={app.wallet.copy} copiedLabel={app.wallet.copied} />
          <NetworkBadge name={NETWORK_NAME} variant="outline" icon={<span className="block size-full rounded-full bg-success" />} />
          <span className="text-xs text-muted-foreground">
            {t(s.created, { date: formatDate(split.createdAt, locale) })} · {s.owner}
          </span>
        </div>
      </div>

      {frozen ? (
        <p role="status" className="flex items-start gap-2 rounded-2xl border border-warning/50 bg-warning/10 p-4 text-sm">
          <SnowflakeIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          {s.frozenBanner}
        </p>
      ) : null}

      {/* Stats */}
      <dl className="grid grid-cols-3 gap-3">
        {[
          { label: s.stats.received, value: split.received },
          { label: s.stats.distributed, value: split.distributed },
          { label: s.stats.waiting, value: split.balance, accent: balance > 0n },
        ].map((x) => (
          <div key={x.label} className="rounded-2xl border bg-card p-3 sm:p-4">
            <dt className="text-xs font-semibold text-muted-foreground">{x.label}</dt>
            <dd className={`mt-1 text-base font-extrabold tabular-nums sm:text-xl ${x.accent ? "text-primary-ink" : ""}`}>
              {formatToken(x.value, split.token, locale)}
            </dd>
            <dd className="text-xs text-muted-foreground tabular-nums">{formatUsd(usdValue(x.value, split.token), locale)}</dd>
          </div>
        ))}
      </dl>

      {/* Flow panel */}
      <section aria-labelledby="flow-title" className="rounded-3xl border bg-card/60 p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="flow-title" className="text-lg font-bold">
            {s.flowTitle}
          </h2>
          {phase === "flowing" ? (
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary-ink" aria-live="polite">
              <span className="size-2 animate-pulse rounded-full bg-primary" />
              {s.streaming}
            </p>
          ) : null}
        </div>
        <div className="mt-4">
          <SplitFan
            phase={phase === "idle" && !liveLines ? "idle" : phase}
            paidLabel={s.paidTag}
            source={
              <div>
                <p className="eyebrow text-muted-foreground">{frozen && balance > 0n ? s.flowHeld : s.stats.waiting}</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums">
                  {formatToken(paidLines ? paidLines.reduce((a, l) => a + BigInt(l.amount), 0n) : balance, split.token, locale)}
                </p>
                {balance === 0n && !paidLines ? <p className="mt-1 text-xs text-muted-foreground">{s.flowEmpty}</p> : null}
              </div>
            }
            lines={fanLines}
          />
        </div>
        {split.autoDistribute && !frozen ? <p className="mt-4 text-xs text-muted-foreground">{s.autoOn}</p> : null}
      </section>

      {/* Approvals */}
      {split.pending && split.approval ? (
        <ApprovalsCard split={split} onApprove={(signer) => track(() => approveAs(signer))} disabled={busy || frozen} />
      ) : null}

      {/* Actions */}
      <section aria-label={app.split.tabs.settings} className="flex flex-col gap-4 rounded-3xl border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <SimulateDialog split={split} onSend={onPayment} disabled={busy} />
          {approvalRequired && !split.pending ? (
            <Button size="lg" variant="outline" disabled={busy || frozen || balance === 0n} onClick={() => track(propose)}>
              <UserCheckIcon aria-hidden="true" />
              {s.actions.propose}
            </Button>
          ) : (
            <Button size="lg" variant="outline" disabled={busy || frozen || balance === 0n || !!split.pending} onClick={() => track(() => distribute())}>
              <SendIcon aria-hidden="true" />
              {s.actions.distribute}
            </Button>
          )}
          <Button size="lg" variant={frozen ? "outline" : "destructive"} disabled={busy} onClick={() => track(toggleFreeze)}>
            {frozen ? <SunIcon aria-hidden="true" /> : <SnowflakeIcon aria-hidden="true" />}
            {frozen ? s.actions.unfreeze : s.actions.freeze}
          </Button>
          <SharesDialog split={split} disabled={busy} />
        </div>
        {reason ? <p className="text-sm text-muted-foreground">{reason}</p> : null}
        <TxFeedback
          state={mainTx.state}
          onDismiss={mainTx.reset}
          onRetry={lastAction ? () => void lastAction() : undefined}
        />
        <Disclaimer text={disclaimer} />
      </section>

      {/* Tabs */}
      <Tabs defaultValue="recipients" className="gap-4">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="recipients">{s.tabs.recipients}</TabsTrigger>
          <TabsTrigger value="activity">{s.tabs.activity}</TabsTrigger>
          <TabsTrigger value="settings">{s.tabs.settings}</TabsTrigger>
        </TabsList>
        <TabsContent value="recipients">
          <RecipientsTable split={split} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityLog split={split} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsList split={split} />
        </TabsContent>
      </Tabs>

    </div>
  )
}

function ApprovalsCard({ split, onApprove, disabled }: { split: Split; onApprove: (s: Signer) => void; disabled: boolean }) {
  const { app, locale } = useAppCopy()
  const a = app.split.approvals
  const policy = split.approval!
  const pending = split.pending!
  const count = pending.approvals.length
  return (
    <section aria-labelledby="appr-title" className="rounded-3xl border border-primary/60 bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="appr-title" className="text-lg font-bold">
            {a.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(a.body, { amount: formatToken(pending.amount, split.token, locale), required: policy.required, total: policy.signers.length })}
          </p>
        </div>
        <Badge variant="outline" className="tabular-nums">
          {t(a.count, { n: count, required: policy.required })}
        </Badge>
      </div>
      <div className="mt-4 flex gap-1.5" aria-hidden="true">
        {Array.from({ length: policy.required }).map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${i < count ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>
      <ul className="mt-4 divide-y rounded-2xl border">
        {policy.signers.map((signer) => {
          const approved = pending.approvals.includes(signer.address)
          return (
            <li key={signer.address} className="flex flex-wrap items-center gap-3 p-3">
              <WalletAvatar address={signer.address} size={28} />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-bold">
                  {signer.name}
                  {signer.isYou ? <span className="font-semibold text-muted-foreground"> ({a.youLabel})</span> : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {signer.role} · <WalletAddress address={signer.address} />
                </p>
              </div>
              {approved ? (
                <Badge variant="success">
                  <CheckIcon aria-hidden="true" />
                  {a.approved}
                </Badge>
              ) : signer.isYou ? (
                <Badge variant="outline">
                  <ClockIcon aria-hidden="true" />
                  {a.waiting}
                </Badge>
              ) : (
                <Button size="sm" variant="outline" disabled={disabled} onClick={() => onApprove(signer)} className="w-full sm:w-auto">
                  {t(a.ask, { name: signer.name.split(" ")[0] ?? signer.name })}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function RecipientsTable({ split }: { split: Split }) {
  const { app, locale } = useAppCopy()
  const r = app.split.recipients
  const rows = [
    ...(split.coverFirst
      ? [{ key: "cover", idx: -1, label: split.coverFirst.label, address: split.coverFirst.address, share: `${formatToken(split.coverFirst.amount, split.token, locale)}`, note: r.cover }]
      : []),
    ...split.recipients.map((x, i) => ({
      key: x.id,
      idx: i,
      label: x.label,
      address: x.address,
      share: split.rule === "fixed" ? formatPercent(x.share / 10000, locale) : `${x.share} · ${formatPercent(shareFraction(x.share, split.recipients), locale, 1)}`,
      note: "",
    })),
  ]
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-semibold">{r.name}</th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">{r.share}</th>
            <th scope="col" className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">{r.earned}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {row.idx >= 0 ? <ShareDot index={row.idx} /> : <span className="size-2.5 shrink-0 rounded-full border border-foreground/40" aria-hidden="true" />}
                  <span className="font-bold">{row.label}</span>
                </div>
                <WalletAddress address={row.address} className="mt-0.5 block pl-4.5 text-xs text-muted-foreground" />
                {row.note ? <p className="pl-4.5 text-xs text-muted-foreground">{row.note}</p> : null}
                <p className="pl-4.5 text-xs text-muted-foreground tabular-nums sm:hidden">
                  {r.earned}: {formatToken(split.earned[row.key] ?? "0", split.token, locale)}
                </p>
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{row.share}</td>
              <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">{formatToken(split.earned[row.key] ?? "0", split.token, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SettingsList({ split }: { split: Split }) {
  const { app, locale } = useAppCopy()
  const st = app.split.settings
  const items: { label: string; value: ReactNode }[] = [
    { label: st.rule, value: app.dashboard.rule[split.rule] },
    { label: st.cover, value: split.coverFirst ? `${split.coverFirst.label} · ${formatToken(split.coverFirst.amount, split.token, locale)}` : st.none },
    {
      label: st.approvals,
      value: split.approval
        ? t(st.approvalsValue, { required: split.approval.required, total: split.approval.signers.length, amount: formatToken(split.approval.threshold, split.token, locale) })
        : st.none,
    },
    ...(split.approval ? [{ label: st.signers, value: split.approval.signers.map((x) => `${x.name} (${x.role})`).join(", ") }] : []),
    { label: st.auto, value: split.autoDistribute ? st.autoOn : st.autoOff },
    { label: st.token, value: split.token },
    { label: st.network, value: NETWORK_NAME },
  ]
  return (
    <dl className="divide-y rounded-2xl border bg-card text-sm">
      {items.map((it) => (
        <div key={it.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
          <dt className="font-semibold text-muted-foreground">{it.label}</dt>
          <dd>{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}
