"use client"

import { ChevronDownIcon, DownloadIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { TxStatus } from "@/components/ui/tx-status"
import type { AuditEntry, AuditKind, Split } from "@/lib/demo/types"
import { TOKENS } from "@/lib/demo/tokens"
import { formatToken, formatUnits } from "@/lib/format"
import { cn } from "@/lib/utils"

import { KIND_ICONS, useEntryText } from "./activity-item"
import { useAppCopy } from "./app-provider"

type Filter = "all" | "payments" | "distributions" | "approvals" | "safety"

const FILTER_KINDS: Record<Exclude<Filter, "all">, AuditKind[]> = {
  payments: ["payment"],
  distributions: ["distribution"],
  approvals: ["approval_requested", "approval"],
  safety: ["frozen", "unfrozen", "shares_updated", "created"],
}

function csvCell(value: string) {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** The audit trail: filterable, with per-distribution receipts and CSV export. */
export function ActivityLog({ split }: { split: Split }) {
  const { app, locale } = useAppCopy()
  const a = app.split.activity
  const text = useEntryText()
  const [filter, setFilter] = useState<Filter>("all")
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const entries = filter === "all" ? split.log : split.log.filter((e) => FILTER_KINDS[filter].includes(e.kind))
  const onlyCreated = split.log.every((e) => e.kind === "created")

  function exportCsv() {
    const h = a.csv
    const rows = [[h.date, h.event, h.actor, h.amount, h.token, h.hash]]
    for (const e of split.log) {
      const tx = text(e, split)
      rows.push([
        e.at,
        tx.title,
        e.actor,
        e.amount ? formatUnits(e.amount, TOKENS[split.token].decimals, "en", TOKENS[split.token].decimals).replace(/,/g, "") : "",
        e.amount ? split.token : "",
        e.hash,
      ])
      for (const line of e.lines ?? []) {
        rows.push([e.at, `  → ${line.label}`, line.address, formatUnits(line.amount, TOKENS[split.token].decimals, "en", TOKENS[split.token].decimals).replace(/,/g, ""), split.token, e.hash])
      }
    }
    const csv = "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `${split.id}-activity.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label={a.filterLabel} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {(["all", "payments", "distributions", "approvals", "safety"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-bold transition-colors duration-150",
                filter === f ? "border-foreground bg-foreground text-background" : "border-input text-muted-foreground hover:text-foreground"
              )}
            >
              {a.filters[f]}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} className="self-start sm:self-auto">
          <DownloadIcon aria-hidden="true" />
          {a.export}
        </Button>
      </div>

      {onlyCreated && filter === "all" ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">{a.empty}</p> : null}
      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">{a.emptyFiltered}</p>
      ) : (
        <ol className="divide-y rounded-2xl border bg-card">
          {entries.map((e) => (
            <Entry key={e.id} entry={e} split={split} open={!!open[e.id]} onToggle={() => setOpen((o) => ({ ...o, [e.id]: !o[e.id] }))} locale={locale} />
          ))}
        </ol>
      )}
    </div>
  )
}

function Entry({ entry, split, open, onToggle, locale }: { entry: AuditEntry; split: Split; open: boolean; onToggle: () => void; locale: "en" | "fr" }) {
  const { app } = useAppCopy()
  const a = app.split.activity
  const tx = useEntryText()(entry, split)
  const Icon = KIND_ICONS[entry.kind]
  const hasLines = !!entry.lines?.length
  return (
    <li className="p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full border">
          <Icon className="size-4 text-primary" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="font-bold">
              {tx.title}
              {entry.held ? <span className="ml-1.5 text-xs font-semibold text-warning">({a.held})</span> : null}
            </p>
            {tx.amount ? <p className="font-bold tabular-nums">{tx.amount}</p> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {tx.who} · <time dateTime={entry.at}>{tx.date}</time>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TxStatus status="confirmed" hash={entry.hash} label={app.tx.confirmed} className="py-1 text-xs" />
            {hasLines ? (
              <Button variant="ghost" size="xs" onClick={onToggle} aria-expanded={open}>
                {open ? a.hideLines : a.showLines}
                <ChevronDownIcon className={cn("transition-transform duration-150", open && "rotate-180")} aria-hidden="true" />
              </Button>
            ) : null}
          </div>
          {hasLines && open ? (
            <ul className="mt-3 divide-y rounded-xl border bg-muted/40 text-sm">
              {entry.lines!.map((line) => (
                <li key={line.key} className="flex items-start justify-between gap-3 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{line.label}</span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">{line.address}</span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    {formatToken(line.amount, split.token, locale)}
                    {line.dust ? (
                      <span className="block text-xs text-muted-foreground">
                        {app.split.dustTag} {formatToken(line.dust, split.token, locale, TOKENS[split.token].decimals)}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </li>
  )
}
