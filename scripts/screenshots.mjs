// Visual check of every page and key flow with Playwright.
// Usage: pnpm build && pnpm start   (in another terminal)
//        pnpm screenshots            (BASE_URL defaults to http://localhost:3000)
// Output: docs/screenshots/<locale>-<width>-<theme>-<name>.png
import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

const BASE = process.env.BASE_URL ?? "http://localhost:3000"
const OUT = fileURLToPath(new URL("../docs/screenshots/", import.meta.url))
const ONLY = process.env.ONLY // optional filter on the variant name

const widths = { 390: { width: 390, height: 844 }, 1440: { width: 1440, height: 900 } }
const variants = []
for (const w of [390, 1440]) for (const theme of ["light", "dark"]) variants.push({ locale: "en", w, theme, full: true })
// French: home page and one key flow, both widths, light.
for (const w of [390, 1440]) variants.push({ locale: "fr", w, theme: "light", full: false })

async function newPage(browser, { locale, w, theme }) {
  const context = await browser.newContext({
    viewport: widths[w],
    colorScheme: theme,
    locale: locale === "fr" ? "fr-CA" : "en-CA",
    reducedMotion: "no-preference",
  })
  await context.addInitScript((t) => {
    try {
      window.localStorage.setItem("theme", t)
    } catch {}
  }, theme)
  const page = await context.newPage()
  return { context, page }
}

const shot = async (page, v, name, fullPage = false) => {
  const file = `${OUT}${v.locale}-${v.w}-${v.theme}-${name}.png`
  await page.waitForTimeout(250)
  await page.screenshot({ path: file, fullPage })
  console.log("  ✓", `${v.locale}-${v.w}-${v.theme}-${name}`)
}

const isMobile = (v) => v.w < 768

async function connect(page, v, capture) {
  await page.goto(`${BASE}/${v.locale}/app`, { waitUntil: "networkidle" })
  const btn = page.getByRole("main").getByRole("button", { name: v.locale === "fr" ? "Connecter le portefeuille de démo" : "Connect demo wallet" })
  await btn.waitFor()
  if (capture) await shot(page, v, "app-01-gate", true)
  await btn.click()
  const dialog = page.getByRole("dialog")
  await dialog.waitFor()
  if (capture) await shot(page, v, "flow1-connect-prompt")
  await dialog.getByRole("button", { name: v.locale === "fr" ? "Confirmer" : "Confirm" }).click()
  await page.getByRole("heading", { level: 1, name: v.locale === "fr" ? "Vos partages" : "Your splits", exact: true }).waitFor({ timeout: 10000 })
}

async function marketing(page, v) {
  for (const [name, path] of [
    ["home", ""],
    ["how-it-works", "/how-it-works"],
    ["credits", "/credits"],
    ["pricing", "/pricing"],
    ["404", "/this-page-does-not-exist"],
  ]) {
    await page.goto(`${BASE}/${v.locale}${path}`, { waitUntil: "networkidle" })
    await page.waitForTimeout(400)
    await shot(page, v, `page-${name}`, true)
  }
  if (isMobile(v)) {
    await page.goto(`${BASE}/${v.locale}`, { waitUntil: "networkidle" })
    await page.getByRole("button", { name: "Open menu" }).click()
    await page.getByRole("dialog").waitFor()
    await shot(page, v, "page-mobile-menu")
  }
}

async function appFlows(page, v) {
  // Flow 1: connect (gate + prompt captured inside connect())
  await connect(page, v, true)
  await shot(page, v, "app-02-dashboard", true)

  // Rejected connection (failure state of flow 1)
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("splitflow-demo-v1"))
    s.wallet.status = "disconnected"
    localStorage.setItem("splitflow-demo-v1", JSON.stringify(s))
  })
  await page.reload({ waitUntil: "networkidle" })
  await page.getByRole("main").getByRole("button", { name: "Connect demo wallet" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Reject" }).click()
  await page.getByText("You declined the sign-in request").waitFor()
  await shot(page, v, "flow1-connect-rejected")
  await page.getByRole("main").getByRole("button", { name: "Connect demo wallet" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click()
  await page.getByRole("heading", { level: 1, name: "Your splits", exact: true }).waitFor({ timeout: 10000 })

  // Flow 2: create a split
  await page.goto(`${BASE}/${v.locale}/app/new`, { waitUntil: "networkidle" })
  await page.getByRole("heading", { level: 1 }).waitFor()
  await shot(page, v, "flow2-composer-blank", true)
  await page.getByRole("button", { name: "Deploy split" }).click()
  await page.waitForTimeout(200)
  await shot(page, v, "flow2-composer-errors", true)
  await page.getByRole("button", { name: "Hackathon prize" }).click()
  await page.getByLabel("Name", { exact: true }).fill("Spring hackathon prize")
  await shot(page, v, "flow2-composer-filled", true)
  // Fail once to show the failed deploy state
  await page.getByRole("button", { name: "Demo controls" }).click()
  await page.getByLabel("Fail the next transaction").click()
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Deploy split" }).click()
  await page.getByRole("dialog").waitFor()
  await shot(page, v, "flow2-deploy-prompt")
  await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click()
  await page.getByText("Waiting for the network…").first().waitFor()
  await shot(page, v, "flow2-deploy-pending")
  await page.getByText("The transaction failed on the network").waitFor({ timeout: 10000 })
  await page.getByText("The transaction failed on the network").scrollIntoViewIfNeeded()
  await shot(page, v, "flow2-deploy-failed")
  await page.getByRole("button", { name: "Try again" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click()
  await page.waitForURL(/\/app\/split\//, { timeout: 15000 })
  await page.getByRole("heading", { level: 1, name: "Spring hackathon prize" }).waitFor()
  await shot(page, v, "flow2-deployed", true)

  // Flow 3: simulate a payment, then distribute (co-op split, manual distribution)
  await page.goto(`${BASE}/${v.locale}/app/split/market-street-coop`, { waitUntil: "networkidle" })
  await page.getByRole("heading", { level: 1 }).waitFor()
  await shot(page, v, "flow3-split-waiting", true)
  await page.getByRole("button", { name: "Simulate a payment" }).click()
  await page.getByRole("dialog").waitFor()
  await shot(page, v, "flow3-simulate-dialog")
  await page.getByRole("dialog").getByRole("button", { name: "Send test payment" }).click()
  await page.getByRole("dialog", { name: /Send/ }).getByRole("button", { name: "Confirm" }).click()
  await page.getByText(/Payment received/).first().waitFor({ timeout: 10000 })
  await page.getByRole("button", { name: "Distribute now" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click()
  await page.getByText("Distributing…").first().waitFor()
  await page.getByRole("heading", { name: "Waiting to be distributed" }).scrollIntoViewIfNeeded()
  await shot(page, v, "flow3-distributing")
  await page.getByText(/Paid .* to \d recipients/).first().waitFor({ timeout: 10000 })
  await page.waitForTimeout(900)
  await page.getByRole("heading", { name: "Waiting to be distributed" }).scrollIntoViewIfNeeded()
  await shot(page, v, "flow3-paid")

  // Flow 5: audit log with a receipt open
  await page.getByRole("tab", { name: "Activity" }).click()
  await page.getByRole("button", { name: "Show receipt" }).first().click()
  await page.getByRole("tab", { name: "Activity" }).scrollIntoViewIfNeeded()
  await shot(page, v, "flow5-activity")

  // Flow 4: approvals, then freeze (club split: 2,500 waiting, threshold 2,000)
  await page.goto(`${BASE}/${v.locale}/app/split/campus-sponsorships`, { waitUntil: "networkidle" })
  await page.getByRole("heading", { level: 1 }).waitFor()
  await page.getByRole("button", { name: "Propose payout" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click()
  await page.getByRole("heading", { name: "Payout waiting for approvals" }).waitFor({ timeout: 10000 })
  await page.getByRole("heading", { name: "Payout waiting for approvals" }).scrollIntoViewIfNeeded()
  await shot(page, v, "flow4-approvals")
  await page.getByRole("button", { name: /Approve as Inès/ }).click()
  await page.getByText(/Paid .* to \d recipients/).first().waitFor({ timeout: 10000 })
  await page.waitForTimeout(900)
  await page.getByRole("heading", { name: "Waiting to be distributed" }).scrollIntoViewIfNeeded()
  await shot(page, v, "flow4-approved-paid")
  await page.getByRole("button", { name: "Freeze split" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click()
  await page.getByText("This split is frozen.").waitFor({ timeout: 10000 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot(page, v, "flow4-frozen", true)

  // Demo controls
  await page.getByRole("button", { name: "Demo controls" }).click()
  await page.getByRole("dialog").waitFor()
  await shot(page, v, "app-03-demo-controls")
  await page.keyboard.press("Escape")
}

async function frenchFlow(page, v) {
  await page.goto(`${BASE}/fr`, { waitUntil: "networkidle" })
  await page.waitForTimeout(400)
  await shot(page, v, "page-home", true)
  await connect(page, v, true)
  await shot(page, v, "app-02-dashboard", true)
  await page.goto(`${BASE}/fr/app/split/market-street-coop`, { waitUntil: "networkidle" })
  await page.getByRole("heading", { level: 1 }).waitFor()
  await page.getByRole("button", { name: "Verser maintenant" }).click()
  await page.getByRole("dialog").waitFor()
  await shot(page, v, "flow3-prompt")
  await page.getByRole("dialog").getByRole("button", { name: "Confirmer" }).click()
  await page.getByText(/versés à \d destinataires/).first().waitFor({ timeout: 10000 })
  await page.waitForTimeout(900)
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot(page, v, "flow3-paid", true)
  await page.goto(`${BASE}/fr/app/new`, { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "Surplus de coop" }).click()
  await shot(page, v, "flow2-composer-filled", true)
}

const browser = await chromium.launch()
await mkdir(OUT, { recursive: true })
for (const v of variants) {
  const tag = `${v.locale}-${v.w}-${v.theme}`
  if (ONLY && !tag.includes(ONLY)) continue
  console.log(tag)
  const { context, page } = await newPage(browser, v)
  try {
    if (v.locale === "fr") await frenchFlow(page, v)
    else {
      await marketing(page, v)
      await appFlows(page, v)
    }
  } catch (e) {
    console.error("  ✗", tag, e.message)
    await page.screenshot({ path: `${OUT}_error-${tag}.png` }).catch(() => {})
    process.exitCode = 1
  }
  await context.close()
}
await browser.close()
