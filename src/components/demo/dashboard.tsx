"use client"

import { ChevronRightIcon, PlusIcon, SnowflakeIcon, UserCheckIcon } from "lucide-react"
import Link from "next/link"

import { ShareBar } from "@/components/diagrams/share-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { href } from "@/i18n/config"
import { t } from "@/i18n/t"
import { shareFraction } from "@/lib/demo/allocate"
import { useDemo } from "@/lib/demo/store"
import { usdValue } from "@/lib/demo/tokens"
import type { Split } from "@/lib/demo/types"
import { formatToken, formatUsd } from "@/lib/format"

import { ActivityRow } from "./activity-item"
import { useAppCopy } from "./app-provider"

export function Dashboard() {
  const demo = useDemo()
  const { app, locale } = useAppCopy()
  const d = app.dashboard
  if (!demo) return null
  const splits = demo.splits

  const sum = (pick: (s: Split) => string) => splits.reduce((acc, s) => acc + usdValue(pick(s), s.token), 0)
  const stats = [
    { label: d.stats.received, value: formatUsd(sum((s) => s.received), locale) },
    { label: d.stats.distributed, value: formatUsd(sum((s) => s.distributed), locale) },
    { label: d.stats.waiting, value: formatUsd(sum((s) => s.balance), locale), accent: true },
    { label: d.stats.active, value: String(splits.filter((s) => s.status === "active").length) },
  ]

  const activity = splits
    .flatMap((s) => s.log.map((entry) => ({ entry, split: s })))
    .sort((a, b) => b.entry.at.localeCompare(a.entry.at))
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-4xl font-extrabold tracking-display">{d.title}</h1>
        <Button asChild size="lg">
          <Link href={href(locale, "/app/new")}>
            <PlusIcon aria-hidden="true" />
            {d.newSplit}
          </Link>
        </Button>
      </div>

      <section aria-label={d.stats.usdNote}>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border bg-card p-4">
              <dt className="text-xs font-semibold text-muted-foreground">{s.label}</dt>
              <dd className={`mt-1 text-xl font-extrabold tabular-nums sm:text-2xl ${s.accent ? "text-primary-ink" : ""}`}>{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="splits-title" className="min-w-0">
          <h2 id="splits-title" className="sr-only">
            {d.title}
          </h2>
          {splits.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed p-10 text-center">
              <p className="text-lg font-bold">{d.empty.title}</p>
              <Button asChild className="mt-6">
                <Link href={href(locale, "/app/new")}>
                  <PlusIcon aria-hidden="true" />
                  {d.empty.create}
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {splits.map((s) => (
                <li key={s.id}>
                  <SplitRow split={s} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="activity-title" className="min-w-0 lg:border-l lg:pl-8">
          <h2 id="activity-title" className="text-lg font-bold">
            {d.activity}
          </h2>
          {activity.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{d.activityEmpty}</p>
          ) : (
            <ul className="mt-2 divide-y">
              {activity.map(({ entry, split }) => (
                <li key={`${split.id}-${entry.id}`}>
                  <ActivityRow entry={entry} split={split} showSplit />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function SplitRow({ split }: { split: Split }) {
  const { app, locale } = useAppCopy()
  const d = app.dashboard
  const waiting = BigInt(split.balance) > 0n
  const segments = split.recipients.map((r) => ({ key: r.id, label: r.label, value: shareFraction(r.share, split.recipients) }))

  return (
    <Link
      href={href(locale, `/app/split/${split.id}`)}
      className="group flex flex-col gap-4 rounded-2xl border bg-card p-5 transition-colors duration-150 hover:border-foreground/30"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {split.status === "frozen" ? (
              <Badge variant="warning">
                <SnowflakeIcon aria-hidden="true" />
                {d.frozen}
              </Badge>
            ) : (
              <Badge variant="success">{d.active}</Badge>
            )}
            {split.pending ? (
              <Badge variant="outline">
                <UserCheckIcon aria-hidden="true" />
                {d.needsApproval}
              </Badge>
            ) : null}
          </div>
          <h3 className="mt-2 text-lg leading-snug font-bold group-hover:underline group-hover:underline-offset-4">{split.name}</h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{split.purpose}</p>
        </div>
        <ChevronRightIcon className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
      <ShareBar segments={segments} size="sm" />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <p className="text-muted-foreground">
          {d.rule[split.rule]}
          {split.coverFirst ? ` + ${d.coverFirst}` : ""} · {t(d.recipientsCount, { n: split.recipients.length })}
        </p>
        {waiting ? (
          <p className="font-bold text-primary-ink">{t(d.waitingBadge, { amount: formatToken(split.balance, split.token, locale) })}</p>
        ) : null}
      </div>
      <span className="sr-only">{d.open}</span>
    </Link>
  )
}
