import { allocate } from "./allocate"
import { randomId } from "./ids"
import type { AuditEntry, Recipient, Signer, Split } from "./types"

/**
 * Pure state transitions for a split. They mirror what the contract does on a
 * confirmed transaction; the store and the seed both go through them, so the
 * seeded history and live actions always follow the same rules.
 */

interface Meta {
  at: string
  hash: string
  actor: string
  actorAddress: string
}

const add = (a: string, b: string | bigint) => (BigInt(a) + BigInt(b)).toString()

function withLog(split: Split, entry: Omit<AuditEntry, "id">): Split {
  return { ...split, log: [{ id: randomId("log"), ...entry }, ...split.log] }
}

export function applyPayment(split: Split, amount: string, meta: Meta): Split {
  const next: Split = {
    ...split,
    balance: add(split.balance, amount),
    received: add(split.received, amount),
  }
  return withLog(next, {
    kind: "payment",
    amount,
    held: split.status === "frozen",
    ...meta,
  })
}

/** Distribute `amount` (default: everything waiting in the split). */
export function applyDistribution(
  split: Split,
  meta: Meta & { auto?: boolean; amount?: string }
): Split {
  const waiting = BigInt(split.balance)
  const wanted = meta.amount ? BigInt(meta.amount) : waiting
  const amount = wanted < waiting ? wanted : waiting
  if (amount <= 0n) return split
  const lines = allocate(amount, split)
  const earned = { ...split.earned }
  for (const line of lines) earned[line.key] = add(earned[line.key] ?? "0", line.amount)
  const next: Split = {
    ...split,
    balance: (waiting - amount).toString(),
    distributed: add(split.distributed, amount),
    earned,
    pending: null,
  }
  return withLog(next, {
    kind: "distribution",
    amount: amount.toString(),
    lines,
    auto: meta.auto,
    at: meta.at,
    hash: meta.hash,
    actor: meta.actor,
    actorAddress: meta.actorAddress,
  })
}

export function needsApproval(split: Split, amount: bigint = BigInt(split.balance)): boolean {
  return !!split.approval && amount >= BigInt(split.approval.threshold)
}

export function requestApproval(split: Split, you: Signer, meta: Meta): Split {
  const next: Split = {
    ...split,
    pending: {
      id: randomId("dist"),
      amount: split.balance,
      createdAt: meta.at,
      approvals: [you.address],
    },
  }
  return withLog(next, { kind: "approval_requested", amount: split.balance, ...meta })
}

export function applyApproval(split: Split, signer: Signer, meta: Omit<Meta, "actor" | "actorAddress">): Split {
  if (!split.pending || split.pending.approvals.includes(signer.address)) return split
  const next: Split = {
    ...split,
    pending: { ...split.pending, approvals: [...split.pending.approvals, signer.address] },
  }
  return withLog(next, {
    kind: "approval",
    amount: split.pending.amount,
    actor: signer.name,
    actorAddress: signer.address,
    ...meta,
  })
}

export function approvalsMet(split: Split): boolean {
  return !!split.approval && !!split.pending && split.pending.approvals.length >= split.approval.required
}

export function setFrozen(split: Split, frozen: boolean, meta: Meta): Split {
  return withLog({ ...split, status: frozen ? "frozen" : "active" }, { kind: frozen ? "frozen" : "unfrozen", ...meta })
}

export function updateShares(split: Split, recipients: Recipient[], meta: Meta): Split {
  return withLog({ ...split, recipients }, { kind: "shares_updated", ...meta })
}
