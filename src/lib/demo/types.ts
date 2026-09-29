/**
 * Domain types for the Splitflow demo. Everything the UI knows about splits,
 * wallets and transactions goes through these shapes, so the simulated layer
 * in this folder could be replaced by wagmi/viem calls without UI changes.
 *
 * Amounts are always integer base units stored as decimal strings (JSON-safe
 * bigint), e.g. 2,500 tUSDC with 6 decimals = "2500000000".
 */

export type TokenSymbol = "tUSDC" | "tDAI" | "tETH"

export interface Token {
  symbol: TokenSymbol
  decimals: number
  /** Reference price in USD shared by the Monark DeFi demos. */
  usd: number
}

/** fixed: shares are basis points summing to 10,000. points: any positive weights. */
export type RuleKind = "fixed" | "points"

export interface Recipient {
  id: string
  label: string
  address: string
  /** Basis points (fixed) or contribution points (points). */
  share: number
}

export interface CoverFirst {
  label: string
  address: string
  /** Base units taken off the top of each distribution before the rule applies. */
  amount: string
}

export interface Signer {
  name: string
  role: string
  address: string
  isYou?: boolean
}

export interface ApprovalPolicy {
  /** Distributions at or above this amount (base units) need approvals. */
  threshold: string
  required: number
  signers: Signer[]
}

export interface PendingDistribution {
  id: string
  amount: string
  createdAt: string
  /** Addresses of signers who approved. */
  approvals: string[]
}

export type AuditKind =
  | "created"
  | "payment"
  | "distribution"
  | "approval_requested"
  | "approval"
  | "frozen"
  | "unfrozen"
  | "shares_updated"

export interface AllocationLine {
  key: string
  label: string
  address: string
  amount: string
  cover?: boolean
  /** Rounding dust included in `amount`. */
  dust?: string
}

export interface AuditEntry {
  id: string
  at: string
  kind: AuditKind
  /** Human label of who did it (payer, signer, "you"). */
  actor: string
  actorAddress: string
  amount?: string
  hash: string
  lines?: AllocationLine[]
  /** While frozen, payments are held. */
  held?: boolean
  auto?: boolean
}

export interface Split {
  id: string
  name: string
  purpose: string
  token: TokenSymbol
  rule: RuleKind
  recipients: Recipient[]
  coverFirst: CoverFirst | null
  approval: ApprovalPolicy | null
  autoDistribute: boolean
  status: "active" | "frozen"
  address: string
  owner: string
  createdAt: string
  /** Waiting to be distributed (base units). */
  balance: string
  received: string
  distributed: string
  /** Lifetime paid per recipient key (recipient id or "cover"). */
  earned: Record<string, string>
  pending: PendingDistribution | null
  log: AuditEntry[]
}

export type WalletStatus = "disconnected" | "connecting" | "connected"

export interface WalletState {
  status: WalletStatus
  address: string
  name: string
  lastError: "rejected" | null
}

export interface DemoSettings {
  slow: boolean
  failNext: boolean
}

export interface DemoState {
  version: 1
  seededLocale: "en" | "fr"
  wallet: WalletState
  splits: Split[]
  settings: DemoSettings
}

/** Lifecycle of one simulated transaction, as the UI sees it. */
export type TxPhase = "idle" | "signing" | "pending" | "confirmed" | "failed"
export type TxError = "rejected" | "reverted"

export interface TxState {
  phase: TxPhase
  hash?: string
  error?: TxError
}

export interface TxSummary {
  /** Short title, e.g. "Distribute 2,500 tUSDC". */
  title: string
  /** Optional detail rows (label, value). */
  rows?: { label: string; value: string }[]
  /** Transactions that move value show the testnet disclaimer. */
  movesValue: boolean
  /** Off-chain signature (sign-in): no network fee row. */
  noFee?: boolean
}
