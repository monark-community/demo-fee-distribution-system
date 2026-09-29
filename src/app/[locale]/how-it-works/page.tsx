import { ArrowRightIcon, PlusIcon, ShieldCheckIcon, SnowflakeIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { LifecycleDiagram } from "@/components/diagrams/lifecycle-diagram"
import { ShareBar, ShareDot } from "@/components/diagrams/share-bar"
import { SectionDivider } from "@/components/site/section-divider"
import { Button } from "@/components/ui/button"
import { href, isLocale, REPO_URL, type Locale } from "@/i18n/config"
import { getDictionary } from "@/i18n"
import { allocate } from "@/lib/demo/allocate"
import { units } from "@/lib/demo/tokens"
import type { AllocationInput } from "@/lib/demo/allocate"
import { formatPercent, formatToken } from "@/lib/format"
import { pageMetadata } from "@/lib/metadata"

export async function generateMetadata({ params }: PageProps<"/[locale]/how-it-works">): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const m = getDictionary(locale).meta.pages.how
  return pageMetadata(locale, "/how-it-works", m.title, m.description)
}

const INTERFACE = `interface ISplit {
  // Rule: fixed basis points (sum 10_000) or points
  function recipients() external view returns (address[] memory, uint256[] memory);
  function coverFirst() external view returns (address, uint256);

  // Anyone can pay the split like any wallet
  receive() external payable;

  // Pays every recipient their share of what is waiting.
  // Rounds down; the dust goes to the largest share.
  function distribute(uint256 amount) external;

  // Payouts >= threshold need \`required\` approvals
  function propose(uint256 amount) external returns (uint256 id);
  function approve(uint256 id) external; // executes on the last approval

  function freeze() external;   // owner or approver
  function unfreeze() external;

  event PaymentReceived(address indexed from, uint256 amount);
  event Distributed(uint256 amount, address[] to, uint256[] amounts);
  event Frozen(address by);
}`

function Example({ locale, input, labels }: { locale: Locale; input: AllocationInput; labels: { recipient: string; share: string; amount: string } }) {
  const lines = allocate(BigInt(units(2500, "tUSDC")), input)
  const total = input.recipients.reduce((s, r) => s + r.share, 0)
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border bg-card">
      <div className="p-4">
        <ShareBar size="sm" segments={input.recipients.map((r) => ({ key: r.id, label: r.label, value: r.share / total }))} />
      </div>
      <table className="w-full text-sm">
        <thead className="border-y bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2 font-semibold">{labels.recipient}</th>
            <th scope="col" className="px-4 py-2 text-right font-semibold">{labels.share}</th>
            <th scope="col" className="px-4 py-2 text-right font-semibold">{labels.amount}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {lines.map((line) => {
            const idx = input.recipients.findIndex((r) => r.id === line.key)
            const r = input.recipients[idx]
            return (
              <tr key={line.key}>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    {idx >= 0 ? <ShareDot index={idx} /> : <span className="size-2.5 rounded-full border border-foreground/40" aria-hidden="true" />}
                    {line.label}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {r ? (input.rule === "fixed" ? formatPercent(r.share / 10000, locale) : `${r.share} / ${total}`) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatToken(line.amount, "tUSDC", locale, 6)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default async function HowItWorksPage({ params }: PageProps<"/[locale]/how-it-works">) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)
  const h = dict.how
  const club = dict.seed.club
  const labels = { recipient: h.rules.recipient, share: h.rules.share, amount: h.rules.amount }
  const a = "0x0000000000000000000000000000000000000000"

  const fixed: AllocationInput = {
    rule: "fixed",
    coverFirst: null,
    recipients: [
      { id: "a", label: club.events, address: a, share: 4000 },
      { id: "b", label: club.instructors, address: a, share: 3000 },
      { id: "c", label: club.prizes, address: a, share: 2000 },
      { id: "d", label: club.treasury, address: a, share: 1000 },
    ],
  }
  const points: AllocationInput = {
    rule: "points",
    coverFirst: null,
    recipients: [
      { id: "a", label: "Léa Tremblay", address: a, share: 34 },
      { id: "b", label: "Omar Haddad", address: a, share: 28 },
      { id: "c", label: "Priya Nair", address: a, share: 22 },
      { id: "d", label: "Jonas Weber", address: a, share: 13 },
    ],
  }
  const cover: AllocationInput = {
    rule: "fixed",
    coverFirst: { label: h.rules.cover.costLabel, address: a, amount: units(350, "tUSDC") },
    recipients: [
      { id: "a", label: dict.seed.coop.growers, address: a, share: 4500 },
      { id: "b", label: dict.seed.coop.bakery, address: a, share: 2500 },
      { id: "c", label: dict.seed.coop.roaster, address: a, share: 2000 },
      { id: "d", label: dict.seed.coop.fund, address: a, share: 1000 },
    ],
  }

  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-4 pt-12 pb-10 sm:px-6 lg:pt-16" aria-labelledby="how-title">
        <h1 id="how-title" className="text-4xl font-extrabold tracking-display sm:text-5xl">
          {h.title}
        </h1>
        <p className="mt-5 max-w-[68ch] text-lg text-muted-foreground">{h.intro}</p>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6" aria-labelledby="life-title">
        <h2 id="life-title" className="text-2xl font-bold tracking-display sm:text-[2rem]">
          {h.lifecycle.title}
        </h2>
        <div className="mt-6 overflow-x-auto rounded-3xl border bg-card p-4 sm:p-8">
          <div className="min-w-[520px]">
            <LifecycleDiagram
              label={h.lifecycle.diagramLabel}
              payer={h.lifecycle.payer}
              contract={h.lifecycle.contract}
              checks={h.lifecycle.checks}
              recipients={h.lifecycle.recipients}
            />
          </div>
        </div>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {h.lifecycle.steps.map((step, i) => (
            <li key={step.title}>
              <span className="inline-flex size-8 items-center justify-center rounded-full border-2 border-primary text-sm font-extrabold">{i + 1}</span>
              <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
              <p className="mt-1.5 text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <SectionDivider />

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="rules-title">
        <h2 id="rules-title" className="text-2xl font-bold tracking-display sm:text-[2rem]">
          {h.rules.title}
        </h2>
        <p className="mt-3 max-w-[68ch] text-muted-foreground">{h.rules.intro}</p>
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {[
            { copy: h.rules.fixed, input: fixed },
            { copy: h.rules.points, input: points },
            { copy: h.rules.cover, input: cover },
          ].map(({ copy, input }) => (
            <div key={copy.title}>
              <h3 className="text-xl font-bold">{copy.title}</h3>
              <p className="mt-2 text-muted-foreground">{copy.body}</p>
              <Example locale={locale} input={input} labels={labels} />
            </div>
          ))}
        </div>
        <div className="mt-10 max-w-3xl rounded-2xl border border-dashed p-5">
          <h3 className="font-bold">{h.rules.dustTitle}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{h.rules.dustBody}</p>
        </div>
      </section>

      <section className="border-y bg-secondary/50" aria-labelledby="safety-title">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="safety-title" className="text-2xl font-bold tracking-display sm:text-[2rem]">
            {h.safety.title}
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-6">
              <ShieldCheckIcon className="size-7 text-primary" strokeWidth={1.75} aria-hidden="true" />
              <h3 className="mt-4 text-xl font-bold">{h.safety.approvalsTitle}</h3>
              <p className="mt-2 text-muted-foreground">{h.safety.approvalsBody}</p>
              <div className="mt-5 flex gap-1.5" aria-hidden="true">
                <span className="h-1.5 flex-1 rounded-full bg-primary" />
                <span className="h-1.5 flex-1 rounded-full bg-primary" />
                <span className="h-1.5 flex-1 rounded-full bg-muted" />
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <SnowflakeIcon className="size-7 text-primary" strokeWidth={1.75} aria-hidden="true" />
              <h3 className="mt-4 text-xl font-bold">{h.safety.freezeTitle}</h3>
              <p className="mt-2 text-muted-foreground">{h.safety.freezeBody}</p>
            </div>
          </div>
          <div className="mt-6 max-w-3xl">
            <h3 className="text-xl font-bold">{h.audit.title}</h3>
            <p className="mt-2 text-muted-foreground">{h.audit.body}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="dev-title">
        <h2 id="dev-title" className="text-2xl font-bold tracking-display sm:text-[2rem]">
          {h.dev.title}
        </h2>
        <p className="mt-3 max-w-[68ch] text-muted-foreground">{h.dev.body}</p>
        <details className="group mt-6">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 font-bold text-primary-ink [&::-webkit-details-marker]:hidden">
            <PlusIcon className="size-4 transition-transform duration-200 group-open:rotate-45" aria-hidden="true" />
            {h.dev.show}
          </summary>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="min-w-0">
              <h3 className="text-sm font-bold">{h.dev.interfaceTitle}</h3>
              <pre className="mt-3 overflow-x-auto rounded-2xl border bg-card p-4 font-mono text-xs leading-relaxed">
                <code>{INTERFACE}</code>
              </pre>
            </div>
            <div>
              <h3 className="text-sm font-bold">{h.dev.layerTitle}</h3>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {h.dev.layerItems.map((item) => {
                  const [file, ...rest] = item.split(":")
                  return (
                    <li key={item} className="rounded-xl border bg-card p-3">
                      <code className="font-mono text-xs font-bold text-primary-ink">src/lib/demo/{file?.trim()}</code>
                      <span className="mt-1 block text-muted-foreground">{rest.join(":").trim()}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </details>
        <a href={REPO_URL} className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-bold text-primary-ink underline underline-offset-4">
          {h.dev.repo}
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </a>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6" aria-labelledby="how-cta">
        <div className="flex flex-col items-start gap-6 rounded-3xl border bg-card p-8 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="how-cta" className="text-2xl font-bold tracking-display sm:text-3xl">
              {h.cta.title}
            </h2>
          </div>
          <Button asChild size="lg">
            <Link href={href(locale, "/app")}>
              {h.cta.button}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  )
}
