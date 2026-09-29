"use client"

import {
  ArrowDownLeftIcon,
  CheckCheckIcon,
  FilePlus2Icon,
  PencilLineIcon,
  SendIcon,
  SnowflakeIcon,
  SunIcon,
  UserCheckIcon,
  type LucideIcon,
} from "lucide-react"

import { t } from "@/i18n/t"
import { formatDateTime, formatToken, shortHash } from "@/lib/format"
import type { AuditEntry, AuditKind, Split } from "@/lib/demo/types"

import { useAppCopy } from "./app-provider"

export const KIND_ICONS: Record<AuditKind, LucideIcon> = {
  created: FilePlus2Icon,
  payment: ArrowDownLeftIcon,
  distribution: SendIcon,
  approval_requested: UserCheckIcon,
  approval: CheckCheckIcon,
  frozen: SnowflakeIcon,
  unfrozen: SunIcon,
  shares_updated: PencilLineIcon,
}

export function useEntryText() {
  const { app, locale } = useAppCopy()
  const a = app.split.activity
  return (entry: AuditEntry, split: Pick<Split, "token">) => {
    const title =
      entry.kind === "distribution"
        ? t(a.kinds.distribution, { n: entry.lines?.length ?? 0 })
        : a.kinds[entry.kind]
    const who =
      entry.kind === "payment"
        ? t(a.from, { actor: entry.actor })
        : entry.auto
          ? a.auto
          : t(a.by, { actor: entry.actor })
    const amount = entry.amount ? formatToken(entry.amount, split.token, locale) : null
    return { title, who, amount, date: formatDateTime(entry.at, locale), hash: shortHash(entry.hash) }
  }
}

/** Compact row for activity feeds. */
export function ActivityRow({ entry, split, showSplit }: { entry: AuditEntry; split: Split; showSplit?: boolean }) {
  const text = useEntryText()(entry, split)
  const { app } = useAppCopy()
  const Icon = KIND_ICONS[entry.kind]
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border bg-card">
        <Icon className="size-4 text-primary" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">
          {text.title}
          {text.amount ? <span className="font-semibold text-muted-foreground"> · {text.amount}</span> : null}
          {entry.held ? <span className="ml-1 text-xs font-semibold text-warning">({app.split.activity.held})</span> : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {showSplit ? <span className="font-semibold">{split.name} · </span> : null}
          {text.who} · <time dateTime={entry.at}>{text.date}</time>
        </p>
      </div>
    </div>
  )
}
