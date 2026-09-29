import { ArrowRightIcon, HandCoinsIcon, PlusIcon, ReceiptTextIcon, ShieldCheckIcon } from "lucide-react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ShareBar } from "@/components/diagrams/share-bar"
import { HeroDiagram } from "@/components/home/hero-diagram"
import { SectionDivider } from "@/components/site/section-divider"
import { Button } from "@/components/ui/button"
import { href, isLocale } from "@/i18n/config"
import { getDictionary } from "@/i18n"
import { pageMetadata } from "@/lib/metadata"

import marketImg from "../../../public/images/market.jpg"
import studentsImg from "../../../public/images/students.jpg"
import teamImg from "../../../public/images/team.jpg"

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return pageMetadata(locale, "/", null, getDictionary(locale).meta.description)
}

const OUTCOME_ICONS = [HandCoinsIcon, ReceiptTextIcon, ShieldCheckIcon]
const PHOTOS = [studentsImg, teamImg, marketImg]

const RULE_BARS = [
  { segments: [0.4, 0.3, 0.2, 0.1] },
  { segments: [0.34, 0.28, 0.22, 0.16] },
  { cover: 0.28, segments: [0.324, 0.18, 0.144, 0.072] },
]

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)
  const h = dict.home

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden" aria-labelledby="hero-title">
        <Image
          src="/brand/monark-mesh.svg"
          alt=""
          width={569}
          height={571}
          unoptimized
          priority
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-40 w-[34rem] max-w-none opacity-[0.10] select-none sm:-right-24 lg:-top-16 lg:-right-20 lg:w-[46rem] dark:opacity-[0.16]"
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:items-center lg:gap-12 lg:pt-20 lg:pb-24">
          <div>
            <p className="eyebrow text-primary-ink">{h.eyebrow}</p>
            <h1
              id="hero-title"
              className="mt-4 text-[2.25rem] leading-[1.08] font-extrabold tracking-display sm:text-5xl lg:text-[3.6rem]"
            >
              {h.title}
            </h1>
            <p className="mt-5 max-w-[34rem] text-lg text-muted-foreground sm:text-xl">{h.sub}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg">
                <Link href={href(locale, "/app")}>
                  {h.ctaPrimary}
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={href(locale, "/how-it-works")}>{h.ctaSecondary}</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">{dict.common.disclaimer}</p>
          </div>
          <HeroDiagram locale={locale} copy={h.diagram} />
        </div>
      </section>

      <SectionDivider />

      {/* Outcomes */}
      <section aria-labelledby="outcomes-title" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="max-w-2xl">
          <h2 id="outcomes-title" className="text-3xl font-bold tracking-display sm:text-[2rem]">
            {h.outcomes.title}
          </h2>
          <p className="mt-4 text-muted-foreground">{h.outcomes.intro}</p>
        </div>
        <ul className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
          {h.outcomes.items.map((item, i) => {
            const Icon = OUTCOME_ICONS[i] ?? HandCoinsIcon
            return (
              <li key={item.title}>
                <Icon className="size-7 text-primary" strokeWidth={1.75} aria-hidden="true" />
                <h3 className="mt-4 text-xl font-bold">{item.title}</h3>
                <p className="mt-2 text-muted-foreground">{item.body}</p>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Rules */}
      <section aria-labelledby="rules-title" className="border-y bg-secondary/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div>
              <p className="eyebrow text-primary-ink">{h.rules.eyebrow}</p>
              <h2 id="rules-title" className="mt-3 text-3xl font-bold tracking-display sm:text-[2rem]">
                {h.rules.title}
              </h2>
            </div>
            <p className="text-muted-foreground">{h.rules.body}</p>
          </div>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {h.rules.items.map((rule, i) => {
              const bar = RULE_BARS[i] ?? RULE_BARS[0]!
              return (
                <li key={rule.title} className="flex flex-col rounded-2xl border bg-card p-6">
                  <p className="eyebrow text-muted-foreground">{rule.example}</p>
                  <h3 className="mt-2 text-xl font-bold">{rule.title}</h3>
                  <p className="mt-2 flex-1 text-muted-foreground">{rule.body}</p>
                  <div className="mt-6">
                    {"cover" in bar && bar.cover ? (
                      <div className="flex items-center gap-1.5">
                        <div
                          className="flex h-4 items-center justify-center rounded-full border border-foreground/30 bg-muted"
                          style={{ width: `${bar.cover * 100}%` }}
                        />
                        <ShareBar
                          className="flex-1"
                          segments={bar.segments.map((v, j) => ({ key: String(j), label: String(v), value: v / 0.72 }))}
                        />
                      </div>
                    ) : (
                      <ShareBar segments={bar.segments.map((v, j) => ({ key: String(j), label: String(v), value: v }))} />
                    )}
                    {"cover" in bar && bar.cover ? (
                      <p className="mt-2 text-xs font-semibold text-muted-foreground">{h.rules.coverLabel} →</p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
          <Link
            href={href(locale, "/how-it-works")}
            className="mt-8 inline-flex min-h-11 items-center gap-1.5 font-bold text-primary-ink underline underline-offset-4"
          >
            {h.rules.learnMore}
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Who */}
      <section aria-labelledby="who-title" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <p className="eyebrow text-primary-ink">{h.who.eyebrow}</p>
        <h2 id="who-title" className="mt-3 max-w-2xl text-3xl font-bold tracking-display sm:text-[2rem]">
          {h.who.title}
        </h2>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {h.who.items.map((item, i) => (
            <li key={item.title} className="overflow-hidden rounded-2xl border bg-card">
              <div className="relative aspect-[4/3]">
                <Image
                  src={PHOTOS[i] ?? studentsImg}
                  alt={item.alt}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  placeholder="blur"
                  className="object-cover"
                />
              </div>
              <div className="p-5">
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="mt-2 text-muted-foreground">{item.body}</p>
                <p className="mt-4 inline-flex rounded-full border px-3 py-1 font-mono text-xs text-muted-foreground">{item.rule}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <SectionDivider />

      {/* FAQ */}
      <section aria-labelledby="faq-title" className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
        <h2 id="faq-title" className="text-3xl font-bold tracking-display sm:text-[2rem]">
          {h.faq.title}
        </h2>
        <div className="mt-8 divide-y border-y">
          {h.faq.items.map((item) => (
            <details key={item.q} className="group py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-3 text-lg font-bold [&::-webkit-details-marker]:hidden">
                {item.q}
                <PlusIcon className="size-5 shrink-0 text-primary transition-transform duration-200 group-open:rotate-45" aria-hidden="true" />
              </summary>
              <p className="max-w-[68ch] pb-5 text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section aria-labelledby="closing-title" className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col items-start gap-6 rounded-3xl border bg-card p-8 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="closing-title" className="text-2xl font-bold tracking-display sm:text-3xl">
              {h.closing.title}
            </h2>
            <p className="mt-2 text-muted-foreground">{h.closing.body}</p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href={href(locale, "/app")}>
              {h.closing.cta}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  )
}
