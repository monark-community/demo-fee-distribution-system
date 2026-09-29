import type { Metadata } from "next"

import { SplitView } from "@/components/demo/split-view"
import { isLocale, locales } from "@/i18n/config"
import { getDictionary } from "@/i18n"
import { SEED_SPLIT_IDS } from "@/lib/demo/seed"
import { pageMetadata } from "@/lib/metadata"

// The example splits are prerendered; splits created in the browser render on demand
// (the page is a client shell that reads the split from local demo state).
export function generateStaticParams() {
  return locales.flatMap((locale) => SEED_SPLIT_IDS.map((id) => ({ locale, id })))
}

export async function generateMetadata({ params }: PageProps<"/[locale]/app/split/[id]">): Promise<Metadata> {
  const { locale, id } = await params
  if (!isLocale(locale)) return {}
  const m = getDictionary(locale).meta.pages.split
  return { ...pageMetadata(locale, `/app/split/${id}`, m.title, m.description), robots: { index: false, follow: true } }
}

export default async function SplitPage({ params }: PageProps<"/[locale]/app/split/[id]">) {
  const { id } = await params
  return <SplitView id={id} />
}
