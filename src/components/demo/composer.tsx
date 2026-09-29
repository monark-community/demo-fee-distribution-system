"use client"

import { ArrowLeftIcon, CheckCircle2Icon, PlusIcon, RocketIcon, ShuffleIcon, Trash2Icon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useId, useMemo, useState } from "react"
import { toast } from "sonner"

import { ShareBar, ShareDot } from "@/components/diagrams/share-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { href } from "@/i18n/config"
import { t } from "@/i18n/t"
import { allocate } from "@/lib/demo/allocate"
import { useTx } from "@/lib/demo/chain"
import { isAddress, randomAddress, randomHex, seededAddress } from "@/lib/demo/ids"
import { youSigner } from "@/lib/demo/seed"
import { update, useDemo } from "@/lib/demo/store"
import { parseUnits, TOKEN_LIST, TOKENS } from "@/lib/demo/tokens"
import type { RuleKind, Split, TokenSymbol } from "@/lib/demo/types"
import { formatNumber, formatToken } from "@/lib/format"
import { cn } from "@/lib/utils"

import { useAppCopy } from "./app-provider"
import { Disclaimer } from "./disclaimer"
import { TxFeedback } from "./tx-feedback"

interface DraftRecipient {
  id: string
  label: string
  address: string
  share: string
}

interface Draft {
  name: string
  purpose: string
  token: TokenSymbol
  rule: RuleKind
  recipients: DraftRecipient[]
  coverOn: boolean
  cover: { label: string; address: string; amount: string }
  approvalsOn: boolean
  threshold: string
  auto: boolean
}

const rid = () => `r-${randomHex(6)}`

/** Parse a typed share into the stored weight: basis points (fixed) or whole points. */
function toWeight(value: string, rule: RuleKind): number {
  const n = Number(value.replace(",", "."))
  if (!Number.isFinite(n) || n <= 0) return 0
  return rule === "fixed" ? Math.round(n * 100) : Math.round(n)
}

function bpsToPercentString(bps: number): string {
  return String(Number((bps / 100).toFixed(2)))
}

export function Composer() {
  const { app, seed, locale, disclaimer } = useAppCopy()
  const c = app.composer
  const demo = useDemo()
  const router = useRouter()
  const tx = useTx()
  const uid = useId()
  const [showErrors, setShowErrors] = useState(false)
  const [previewAmount, setPreviewAmount] = useState("1000")

  const templates = useMemo(() => {
    const r = (label: string, share: string, seedKey?: string): DraftRecipient => ({
      id: rid(),
      label,
      address: seedKey ? seededAddress(seedKey) : "",
      share,
    })
    const base = { purpose: "", coverOn: false, cover: { label: "", address: "", amount: "" }, approvalsOn: false, threshold: "2000", auto: false }
    return {
      club: {
        ...base,
        name: seed.club.name,
        purpose: seed.club.purpose,
        token: "tUSDC",
        rule: "fixed",
        recipients: [
          r(seed.club.events, "40", "club-events"),
          r(seed.club.instructors, "30", "club-instructors"),
          r(seed.club.prizes, "20", "club-prizes"),
          r(seed.club.treasury, "10", "club-treasury"),
        ],
        approvalsOn: true,
      },
      hackathon: {
        ...base,
        name: seed.hackathon.name,
        purpose: seed.hackathon.purpose,
        token: "tUSDC",
        rule: "points",
        recipients: [
          r("Léa Tremblay", "34", "lea-tremblay"),
          r("Omar Haddad", "28", "omar-haddad"),
          r("Priya Nair", "22", "priya-nair"),
          r("Jonas Weber", "16", "jonas-weber"),
        ],
        auto: true,
      },
      coop: {
        ...base,
        name: seed.coop.name,
        purpose: seed.coop.purpose,
        token: "tDAI",
        rule: "fixed",
        recipients: [
          r(seed.coop.growers, "45", "coop-growers"),
          r(seed.coop.bakery, "25", "coop-bakery"),
          r(seed.coop.roaster, "20", "coop-roaster"),
          r(seed.coop.fund, "10", "coop-fund"),
        ],
        coverOn: true,
        cover: { label: seed.coop.rent, address: seededAddress("coop-rent"), amount: "350" },
      },
      blank: { ...base, name: "", token: "tUSDC", rule: "fixed", recipients: [r("", ""), r("", "")] },
    } satisfies Record<string, Draft>
  }, [seed])

  const [template, setTemplate] = useState<keyof typeof templates>("blank")
  const [draft, setDraft] = useState<Draft>(() => templates.blank)
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }))
  const patchRecipient = (id: string, p: Partial<DraftRecipient>) =>
    setDraft((d) => ({ ...d, recipients: d.recipients.map((r) => (r.id === id ? { ...r, ...p } : r)) }))

  const token = TOKENS[draft.token]
  const weights = draft.recipients.map((r) => toWeight(r.share, draft.rule))
  const totalWeight = weights.reduce((a, b) => a + b, 0)

  // Validation
  const errors = useMemo(() => {
    const e: { name?: string; recipients?: string; total?: string; cover?: string; threshold?: string; rows: Record<string, { label?: string; address?: string; share?: string }> } = { rows: {} }
    if (!draft.name.trim()) e.name = c.errors.name
    if (draft.recipients.length < 2) e.recipients = c.errors.recipients
    const seen = new Set<string>()
    draft.recipients.forEach((r, i) => {
      const row: { label?: string; address?: string; share?: string } = {}
      if (!r.label.trim()) row.label = c.errors.label
      const addr = r.address.trim().toLowerCase()
      if (!isAddress(addr)) row.address = c.errors.address
      else if (seen.has(addr)) row.address = c.errors.duplicate
      seen.add(addr)
      if ((weights[i] ?? 0) <= 0) row.share = c.errors.share
      if (Object.keys(row).length) e.rows[r.id] = row
    })
    if (draft.rule === "fixed" && totalWeight !== 10000) e.total = c.errors.total
    if (draft.coverOn) {
      const amt = parseUnits(draft.cover.amount, token.decimals)
      if (!draft.cover.label.trim() || !isAddress(draft.cover.address) || !amt || amt <= 0n) e.cover = c.errors.cover
    }
    if (draft.approvalsOn) {
      const th = parseUnits(draft.threshold, token.decimals)
      if (!th || th <= 0n) e.threshold = c.errors.threshold
    }
    return e
  }, [draft, weights, totalWeight, token.decimals, c.errors])
  const valid = !errors.name && !errors.recipients && !errors.total && !errors.cover && !errors.threshold && Object.keys(errors.rows).length === 0

  // Preview
  const previewUnits = parseUnits(previewAmount, token.decimals)
  const coverUnits = draft.coverOn ? parseUnits(draft.cover.amount, token.decimals) : null
  const lines =
    previewUnits && previewUnits > 0n && totalWeight > 0
      ? allocate(previewUnits, {
          rule: draft.rule,
          recipients: draft.recipients.map((r, i) => ({ id: r.id, label: r.label || t(c.recipient, { n: i + 1 }), address: r.address, share: weights[i] ?? 0 })),
          coverFirst: draft.coverOn && coverUnits ? { label: draft.cover.label || c.coverLabel, address: draft.cover.address, amount: coverUnits.toString() } : null,
        })
      : []

  const fixedTotal = totalWeight / 10000
  const segments = draft.recipients.map((r, i) => ({
    key: r.id,
    label: r.label,
    value: draft.rule === "fixed" ? (weights[i] ?? 0) / 10000 : totalWeight ? (weights[i] ?? 0) / totalWeight : 0,
  }))

  function applyTemplate(key: keyof typeof templates) {
    setTemplate(key)
    // Fresh ids so React doesn't reuse rows across templates.
    const tpl = templates[key]
    setDraft({ ...tpl, recipients: tpl.recipients.map((r) => ({ ...r, id: rid() })) })
    setShowErrors(false)
    tx.reset()
  }

  function balanceEvenly() {
    const n = draft.recipients.length
    if (!n) return
    if (draft.rule === "fixed") {
      const base = Math.floor(10000 / n)
      const rest = 10000 - base * n
      patch({ recipients: draft.recipients.map((r, i) => ({ ...r, share: bpsToPercentString(base + (i === 0 ? rest : 0)) })) })
    } else {
      patch({ recipients: draft.recipients.map((r) => ({ ...r, share: "10" })) })
    }
  }

  async function deploy() {
    setShowErrors(true)
    if (!valid || !demo) return
    const you = youSigner(seed)
    const recipients = draft.recipients.map((r, i) => ({ id: r.id, label: r.label.trim(), address: r.address.trim().toLowerCase(), share: weights[i] ?? 0 }))
    const signers = [you, { ...seed.club.treasurer, address: seededAddress("ines-laurent") }, { ...seed.club.vp, address: seededAddress("samuel-okafor") }]
    const ok = await tx.run(
      {
        title: t(app.summaries.deploy, { name: draft.name.trim() }),
        rows: [
          { label: c.token, value: draft.token },
          { label: c.ruleTitle, value: draft.rule === "fixed" ? c.rules.fixed : c.rules.points },
          { label: app.summaries.recipients, value: String(recipients.length) },
        ],
        movesValue: true,
      },
      (hash) => {
        const slug = draft.name.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32)
        const id = `${slug || "split"}-${randomHex(4)}`
        const now = new Date().toISOString()
        const split: Split = {
          id,
          name: draft.name.trim(),
          purpose: draft.purpose.trim(),
          token: draft.token,
          rule: draft.rule,
          recipients,
          coverFirst:
            draft.coverOn && coverUnits
              ? { label: draft.cover.label.trim(), address: draft.cover.address.trim().toLowerCase(), amount: coverUnits.toString() }
              : null,
          approval: draft.approvalsOn ? { threshold: (parseUnits(draft.threshold, token.decimals) ?? 0n).toString(), required: 2, signers } : null,
          autoDistribute: draft.auto,
          status: "active",
          address: randomAddress(),
          owner: you.address,
          createdAt: now,
          balance: "0",
          received: "0",
          distributed: "0",
          earned: {},
          pending: null,
          log: [{ id: `${id}-created`, kind: "created", at: now, actor: you.name, actorAddress: you.address, hash }],
        }
        update((s) => ({ ...s, splits: [split, ...s.splits] }))
        toast.success(c.deployed)
        router.push(href(locale, `/app/split/${id}`))
      }
    )
    return ok
  }

  const err = (msg?: string) => (showErrors && msg ? msg : undefined)
  const statusLine =
    draft.rule === "points"
      ? { tone: "muted" as const, text: t(c.pointsTotal, { value: formatNumber(totalWeight, locale) }) }
      : totalWeight === 10000
        ? { tone: "ok" as const, text: c.ready }
        : totalWeight < 10000
          ? { tone: "warn" as const, text: t(c.unallocated, { value: formatNumber((10000 - totalWeight) / 100, locale) }) }
          : { tone: "bad" as const, text: t(c.over, { value: formatNumber((totalWeight - 10000) / 100, locale) }) }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={href(locale, "/app")} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          {c.back}
        </Link>
        <h1 className="mt-2 text-4xl font-extrabold tracking-display">{c.title}</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">{c.intro}</p>
      </div>

      <fieldset>
        <legend className="text-sm font-bold">{c.templates.title}</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["club", "hackathon", "coop", "blank"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={template === key}
              onClick={() => applyTemplate(key)}
              className={cn(
                "inline-flex h-10 items-center rounded-full border px-4 text-sm font-bold transition-colors duration-150",
                template === key ? "border-foreground bg-foreground text-background" : "border-input hover:bg-muted"
              )}
            >
              {c.templates[key]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <form
          noValidate
          className="flex flex-col gap-8"
          onSubmit={(e) => {
            e.preventDefault()
            void deploy()
          }}
          id={`${uid}-form`}
        >
          {/* Basics */}
          <section className="rounded-3xl border bg-card p-5 sm:p-6" aria-labelledby={`${uid}-basics`}>
            <h2 id={`${uid}-basics`} className="text-lg font-bold">
              {c.basics}
            </h2>
            <div className="mt-5 grid gap-5">
              <Field id={`${uid}-name`} label={c.name} error={err(errors.name)}>
                <Input id={`${uid}-name`} value={draft.name} placeholder={c.namePlaceholder} onChange={(e) => patch({ name: e.target.value })} aria-invalid={!!err(errors.name)} aria-describedby={err(errors.name) ? `${uid}-name-err` : undefined} maxLength={80} />
              </Field>
              <Field id={`${uid}-purpose`} label={c.purpose}>
                <Input id={`${uid}-purpose`} value={draft.purpose} placeholder={c.purposePlaceholder} onChange={(e) => patch({ purpose: e.target.value })} maxLength={140} />
              </Field>
              <fieldset>
                <legend className="text-sm font-semibold">{c.token}</legend>
                <PillRadio
                  name={`${uid}-token`}
                  value={draft.token}
                  options={TOKEN_LIST.map((s) => ({ value: s, label: s }))}
                  onChange={(v) => patch({ token: v as TokenSymbol })}
                />
                <p className="mt-2 text-xs text-muted-foreground">{c.tokenHint}</p>
              </fieldset>
            </div>
          </section>

          {/* Rule + recipients */}
          <section className="rounded-3xl border bg-card p-5 sm:p-6" aria-labelledby={`${uid}-rule`}>
            <h2 id={`${uid}-rule`} className="text-lg font-bold">
              {c.ruleTitle}
            </h2>
            <fieldset className="mt-4">
              <legend className="sr-only">{c.ruleTitle}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["fixed", "points"] as const).map((rule) => (
                  <label
                    key={rule}
                    className={cn(
                      "flex cursor-pointer flex-col gap-1 rounded-2xl border p-4 transition-colors duration-150 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                      draft.rule === rule ? "border-primary bg-secondary/60" : "hover:bg-muted/60"
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <input
                        type="radio"
                        name={`${uid}-rulekind`}
                        value={rule}
                        checked={draft.rule === rule}
                        onChange={() => {
                          const recipients =
                            rule === "points" && draft.rule === "fixed"
                              ? draft.recipients.map((r) => ({ ...r, share: r.share ? String(Math.max(1, Math.round(Number(r.share.replace(",", ".")) || 0))) : "" }))
                              : draft.recipients
                          patch({ rule, recipients })
                        }}
                        className="size-4 accent-[var(--primary)]"
                      />
                      {c.rules[rule]}
                    </span>
                    <span className="pl-6 text-xs text-muted-foreground">{rule === "fixed" ? c.rules.fixedHint : c.rules.pointsHint}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-6 flex items-start justify-between gap-4 rounded-2xl border p-4">
              <div>
                <Label htmlFor={`${uid}-cover`} className="text-sm font-bold">
                  {c.cover}
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">{c.coverHint}</p>
              </div>
              <Switch id={`${uid}-cover`} checked={draft.coverOn} onCheckedChange={(v) => patch({ coverOn: v })} />
            </div>
            {draft.coverOn ? (
              <div className="mt-3 grid gap-4 rounded-2xl border border-dashed p-4 sm:grid-cols-2">
                <Field id={`${uid}-cover-label`} label={c.coverLabel}>
                  <Input id={`${uid}-cover-label`} value={draft.cover.label} placeholder={c.coverLabelPlaceholder} onChange={(e) => patch({ cover: { ...draft.cover, label: e.target.value } })} />
                </Field>
                <Field id={`${uid}-cover-amount`} label={`${c.coverAmount} (${draft.token})`}>
                  <Input id={`${uid}-cover-amount`} inputMode="decimal" value={draft.cover.amount} onChange={(e) => patch({ cover: { ...draft.cover, amount: e.target.value } })} />
                </Field>
                <div className="sm:col-span-2">
                  <Field id={`${uid}-cover-address`} label={c.coverAddress}>
                    <div className="flex gap-2">
                      <Input id={`${uid}-cover-address`} className="font-mono text-sm" value={draft.cover.address} placeholder={c.addressPlaceholder} spellCheck={false} autoComplete="off" onChange={(e) => patch({ cover: { ...draft.cover, address: e.target.value } })} />
                      <Button type="button" variant="outline" size="icon" aria-label={c.fillAddress} title={c.fillAddress} onClick={() => patch({ cover: { ...draft.cover, address: randomAddress() } })}>
                        <ShuffleIcon aria-hidden="true" />
                      </Button>
                    </div>
                  </Field>
                </div>
                {err(errors.cover) ? <p className="text-sm text-destructive sm:col-span-2">{errors.cover}</p> : null}
              </div>
            ) : null}

            <h3 className="mt-8 text-base font-bold">{c.recipients}</h3>
            <div className="mt-3">
              <ShareBar segments={segments} unallocated={draft.rule === "fixed" ? Math.max(0, 1 - fixedTotal) : 0} />
              <p
                aria-live="polite"
                className={cn(
                  "mt-2 flex items-center gap-1.5 text-sm font-semibold",
                  statusLine.tone === "ok" && "text-success",
                  statusLine.tone === "warn" && "text-warning",
                  statusLine.tone === "bad" && "text-destructive",
                  statusLine.tone === "muted" && "text-muted-foreground"
                )}
              >
                {statusLine.tone === "ok" ? <CheckCircle2Icon className="size-4" aria-hidden="true" /> : null}
                {statusLine.text}
              </p>
            </div>

            <ol className="mt-5 flex flex-col gap-3">
              {draft.recipients.map((r, i) => {
                const rowErr = showErrors ? errors.rows[r.id] : undefined
                const n = i + 1
                return (
                  <li key={r.id} className="rounded-2xl border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-sm font-bold">
                        <ShareDot index={i} />
                        {t(c.recipient, { n })}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t(c.remove, { n })}
                        disabled={draft.recipients.length <= 1}
                        onClick={() => patch({ recipients: draft.recipients.filter((x) => x.id !== r.id) })}
                      >
                        <Trash2Icon aria-hidden="true" />
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_7.5rem]">
                      <Field id={`${r.id}-label`} label={c.label} error={rowErr?.label}>
                        <Input id={`${r.id}-label`} value={r.label} placeholder={c.labelPlaceholder} onChange={(e) => patchRecipient(r.id, { label: e.target.value })} aria-invalid={!!rowErr?.label} maxLength={60} />
                      </Field>
                      <Field id={`${r.id}-share`} label={draft.rule === "fixed" ? c.sharePercent : c.sharePoints} error={rowErr?.share}>
                        <Input
                          id={`${r.id}-share`}
                          inputMode={draft.rule === "fixed" ? "decimal" : "numeric"}
                          value={r.share}
                          onChange={(e) => patchRecipient(r.id, { share: e.target.value })}
                          aria-invalid={!!rowErr?.share}
                          className="tabular-nums"
                        />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field id={`${r.id}-address`} label={c.address} error={rowErr?.address}>
                          <div className="flex gap-2">
                            <Input
                              id={`${r.id}-address`}
                              className="font-mono text-sm"
                              value={r.address}
                              placeholder={c.addressPlaceholder}
                              spellCheck={false}
                              autoComplete="off"
                              onChange={(e) => patchRecipient(r.id, { address: e.target.value })}
                              aria-invalid={!!rowErr?.address}
                            />
                            <Button type="button" variant="outline" size="icon" aria-label={c.fillAddress} title={c.fillAddress} onClick={() => patchRecipient(r.id, { address: randomAddress() })}>
                              <ShuffleIcon aria-hidden="true" />
                            </Button>
                          </div>
                        </Field>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
            {err(errors.recipients) ? <p className="mt-3 text-sm text-destructive">{errors.recipients}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => patch({ recipients: [...draft.recipients, { id: rid(), label: "", address: "", share: "" }] })} disabled={draft.recipients.length >= 12}>
                <PlusIcon aria-hidden="true" />
                {c.add}
              </Button>
              <Button type="button" variant="ghost" onClick={balanceEvenly}>
                {c.balance}
              </Button>
            </div>
          </section>

          {/* Safety */}
          <section className="rounded-3xl border bg-card p-5 sm:p-6" aria-labelledby={`${uid}-safety`}>
            <h2 id={`${uid}-safety`} className="text-lg font-bold">
              {c.safety}
            </h2>
            <div className="mt-4 flex flex-col divide-y rounded-2xl border">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label htmlFor={`${uid}-appr`} className="text-sm font-bold">
                      {c.approvals}
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">{c.approvalsHint}</p>
                  </div>
                  <Switch id={`${uid}-appr`} checked={draft.approvalsOn} onCheckedChange={(v) => patch({ approvalsOn: v })} />
                </div>
                {draft.approvalsOn ? (
                  <div className="mt-4 max-w-xs">
                    <Field id={`${uid}-threshold`} label={`${c.threshold} (${draft.token})`} error={err(errors.threshold)}>
                      <Input id={`${uid}-threshold`} inputMode="decimal" value={draft.threshold} onChange={(e) => patch({ threshold: e.target.value })} aria-invalid={!!err(errors.threshold)} />
                    </Field>
                  </div>
                ) : null}
              </div>
              <div className="flex items-start justify-between gap-4 p-4">
                <div>
                  <Label htmlFor={`${uid}-auto`} className="text-sm font-bold">
                    {c.auto}
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">{c.autoHint}</p>
                </div>
                <Switch id={`${uid}-auto`} checked={draft.auto} onCheckedChange={(v) => patch({ auto: v })} />
              </div>
            </div>
          </section>
        </form>

        {/* Preview + deploy */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24" aria-labelledby={`${uid}-preview`}>
          <div className="rounded-3xl border bg-card p-5 sm:p-6">
            <h2 id={`${uid}-preview`} className="text-lg font-bold">
              {c.preview}
            </h2>
            <div className="mt-4">
              <Label htmlFor={`${uid}-amount`} className="text-sm font-semibold">
                {c.previewIf} ({draft.token})
              </Label>
              <Input id={`${uid}-amount`} inputMode="decimal" className="mt-2 text-lg font-bold tabular-nums" value={previewAmount} onChange={(e) => setPreviewAmount(e.target.value)} />
            </div>
            {lines.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">{c.previewEmpty}</p>
            ) : (
              <ul className="mt-4 divide-y text-sm">
                {lines.map((line) => {
                  const idx = draft.recipients.findIndex((r) => r.id === line.key)
                  return (
                    <li key={line.key} className="flex items-start justify-between gap-3 py-2.5">
                      <span className="flex min-w-0 items-center gap-2">
                        {line.cover ? <span className="size-2.5 shrink-0 rounded-full border border-foreground/40" aria-hidden="true" /> : <ShareDot index={idx} />}
                        <span className="truncate">{line.label}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="font-bold tabular-nums">{formatToken(line.amount, draft.token, locale)}</span>
                        {line.dust ? <span className="block text-xs text-muted-foreground">{t(c.dustNote, { amount: formatToken(line.dust, draft.token, locale, token.decimals) })}</span> : null}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-3xl border bg-card p-5 sm:p-6">
            <Button type="submit" form={`${uid}-form`} size="lg" disabled={tx.busy}>
              <RocketIcon aria-hidden="true" />
              {tx.busy ? c.deploying : c.deploy}
            </Button>
            {showErrors && !valid ? (
              <p role="alert" className="text-sm text-destructive">
                {c.errors.summary}
              </p>
            ) : null}
            <TxFeedback state={tx.state} pendingLabel={c.deploying} onRetry={() => void deploy()} onDismiss={tx.reset} />
            <Disclaimer text={disclaimer} />
          </div>
        </aside>
      </div>
    </div>
  )
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function PillRadio({ name, value, options, onChange }: { name: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="mt-2 inline-flex flex-wrap gap-1 rounded-full border p-1">
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "inline-flex h-9 cursor-pointer items-center rounded-full px-4 text-sm font-bold transition-colors duration-150 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
            value === o.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
          {o.label}
        </label>
      ))}
    </div>
  )
}
