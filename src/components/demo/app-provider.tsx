"use client"

import { createContext, useContext, useEffect, useMemo, type ComponentProps, type ReactNode } from "react"

import { MonarkMark } from "@/components/ui/site-brand"
import { Toaster } from "@/components/ui/sonner"
import { TxFeedback } from "@/components/ui/tx-feedback"
import { WalletPrompt } from "@/components/ui/wallet-prompt"
import type { Dictionary } from "@/i18n"
import type { Locale } from "@/i18n/config"
import { estimateFee } from "@/lib/demo/chain"
import { initDemo, useDemo, usePrompt } from "@/lib/demo/store"
import { NETWORK_NAME } from "@/lib/demo/tokens"
import type { TxState } from "@/lib/demo/types"

export interface AppCopy {
  locale: Locale
  app: Dictionary["app"]
  seed: Dictionary["seed"]
  disclaimer: string
  demoBadge: string
}

const AppContext = createContext<AppCopy | null>(null)

export function useAppCopy(): AppCopy {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useAppCopy must be used inside <AppProvider>")
  return ctx
}

export function AppProvider({ value, children }: { value: AppCopy; children: ReactNode }) {
  useEffect(() => {
    initDemo(value.seed, value.locale)
  }, [value.seed, value.locale])

  return (
    <AppContext.Provider value={value}>
      {children}
      <DemoWalletPrompt />
      <Toaster
        // Top-right, just under the sticky 64px header : the pages keep that
        // corner clear (titles are left-aligned), whereas bottom-center sat on
        // top of the split fan and its last recipient rows while a payment
        // was being distributed. On phones sonner goes full width, so it
        // drops below the header there too.
        position="top-right"
        offset={{ top: 80, right: 24 }}
        mobileOffset={{ top: 72, left: 16, right: 16 }}
      />
    </AppContext.Provider>
  )
}

/** The simulated wallet's confirmation sheet (@monark/ui WalletPrompt). Closing it counts as a rejection. */
function DemoWalletPrompt() {
  const prompt = usePrompt()
  const demo = useDemo()
  const { app, disclaimer, locale } = useAppCopy()
  const p = app.prompt
  // A fresh fee estimate per request.
  const fee = useMemo(() => (prompt ? estimateFee() : ""), [prompt])
  const feeText = fee ? `${Number(fee).toLocaleString(locale === "fr" ? "fr-CA" : "en-CA", { maximumFractionDigits: 5 })} tETH` : ""
  const summary = prompt?.summary

  return (
    <WalletPrompt
      open={!!prompt}
      title={summary?.title ?? p.title}
      description={p.title}
      site={
        <>
          <MonarkMark />
          {p.site}
        </>
      }
      account={demo ? { name: demo.wallet.name, address: demo.wallet.address } : undefined}
      rows={summary?.rows ?? []}
      network={NETWORK_NAME}
      networkLabel={p.network}
      // Sign-in requests have no fee: the row is left out rather than shown as "No fee".
      fee={summary?.noFee ? undefined : feeText}
      feeLabel={p.fee}
      disclaimer={summary?.movesValue ? disclaimer : p.simulated}
      warning={!!summary?.movesValue}
      confirmLabel={p.confirm}
      rejectLabel={p.reject}
      closeLabel={app.close}
      onConfirm={() => prompt?.resolve(true)}
      onReject={() => prompt?.resolve(false)}
    />
  )
}

/** A transaction's inline feedback (@monark/ui TxFeedback), with the demo's labels. */
export function DemoTxFeedback({
  state,
  pendingLabel,
  ...props
}: { state: TxState; pendingLabel?: string } & Omit<ComponentProps<typeof TxFeedback>, "phase" | "hash" | "error" | "pendingLabel">) {
  const { app } = useAppCopy()
  const tx = app.tx
  return (
    <TxFeedback
      phase={state.phase}
      hash={state.hash}
      error={state.error}
      signingLabel={tx.signing}
      pendingLabel={pendingLabel ?? tx.pending}
      pendingStatusLabel={tx.pending}
      confirmedLabel={tx.confirmed}
      failedLabel={tx.failed}
      reasons={{ rejected: tx.rejected, reverted: tx.reverted }}
      retryLabel={tx.retry}
      dismissLabel={tx.dismiss}
      {...props}
    />
  )
}
