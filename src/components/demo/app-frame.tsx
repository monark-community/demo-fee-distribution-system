"use client"

import { ArrowLeftIcon, Loader2Icon, WalletIcon, XCircleIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { toast } from "sonner"

import { AppLoading } from "@/components/ui/app-loading"
import { Button } from "@/components/ui/button"
import { DemoControls } from "@/components/ui/demo-controls"
import { href } from "@/i18n/config"
import { resetDemo, setSettings, useDemo, useStorageOk } from "@/lib/demo/store"
import { NETWORK_NAME } from "@/lib/demo/tokens"
import { connectWallet } from "@/lib/demo/wallet"

import { useAppCopy } from "./app-provider"

/**
 * The app's one compact bar under the site header: a way back to the
 * dashboard on inner pages, and one network pill that opens the demo
 * controls. The testnet notice lives only in the wallet prompt (§11).
 * Gates the content on wallet connection.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const demo = useDemo()
  const storageOk = useStorageOk()
  const { app, locale } = useAppCopy()
  const pathname = usePathname() ?? ""
  const home = href(locale, "/app")
  const inner = pathname !== home && pathname.startsWith(`${home}/`) && demo?.wallet.status === "connected"

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b bg-secondary/40">
        <div className="mx-auto flex h-12 max-w-6xl items-center gap-4 px-4 sm:px-6">
          {inner ? (
            <Link href={home} className="-ml-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <ArrowLeftIcon className="size-4" aria-hidden="true" />
              {app.dashboard.title}
            </Link>
          ) : null}
          <div className="ml-auto">
            <AppDemoControls />
          </div>
        </div>
      </div>
      {!storageOk ? (
        <p role="alert" className="mx-auto mt-4 w-full max-w-6xl px-4 text-sm text-warning sm:px-6">
          {app.storageError}
        </p>
      ) : null}
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 lg:py-10">
        {!demo ? <AppLoading label={app.loading} /> : demo.wallet.status !== "connected" ? <ConnectGate /> : children}
      </div>
    </div>
  )
}

/** The demo controls (@monark/ui DemoControls), wired to the demo store. */
function AppDemoControls() {
  const demo = useDemo()
  const { app, seed, locale } = useAppCopy()
  const c = app.controls
  if (!demo) return null
  return (
    <DemoControls
      networkName={NETWORK_NAME}
      slow={demo.settings.slow}
      onSlowChange={(v) => setSettings({ slow: v })}
      failNext={demo.settings.failNext}
      onFailNextChange={(v) => setSettings({ failNext: v })}
      onReset={() => {
        resetDemo(seed, locale)
        toast.success(c.resetDone)
      }}
      title={c.title}
      openLabel={c.open}
      slowLabel={c.slow}
      slowHint={c.slowHint}
      failNextLabel={c.failNext}
      failNextHint={c.failNextHint}
      resetLabel={c.reset}
      resetHint={c.resetHint}
      resetConfirmTitle={c.resetConfirm}
      resetConfirmBody={c.resetConfirmBody}
      resetConfirmLabel={c.resetDo}
      cancelLabel={c.cancel}
      closeLabel={app.close}
    />
  )
}

function ConnectGate() {
  const demo = useDemo()
  const { app } = useAppCopy()
  const g = app.gate
  const connecting = demo?.wallet.status === "connecting"
  const rejected = demo?.wallet.lastError === "rejected"

  return (
    <section aria-labelledby="gate-title" className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center py-8 text-center">
      <Image src="/brand/monark-mark.svg" alt="" width={56} height={56} unoptimized className="size-14" />
      <h1 id="gate-title" className="mt-6 text-3xl font-extrabold tracking-display">
        {g.title}
      </h1>
      <p className="mt-3 text-muted-foreground">{g.body}</p>
      <Button
        size="lg"
        className="mt-8 w-full sm:w-auto"
        disabled={connecting}
        onClick={() =>
          void connectWallet({
            title: app.summaries.signIn,
            rows: [{ label: app.summaries.signInRow, value: app.summaries.signInValue }],
            movesValue: false,
            noFee: true,
          })
        }
      >
        {connecting ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : <WalletIcon aria-hidden="true" />}
        {connecting ? app.wallet.connecting : g.connect}
      </Button>
      <div aria-live="polite" className="mt-4 min-h-6">
        {rejected ? (
          <p role="alert" className="flex items-start gap-2 text-left text-sm text-destructive">
            <XCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {g.rejected}
          </p>
        ) : null}
      </div>
    </section>
  )
}
