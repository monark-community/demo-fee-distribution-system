# Splitflow by Monark

Splitflow gives a club, team or co-op **one address that splits every incoming payment among its contributors the moment it lands**, with a receipt anyone can check. It is Monark's payments / profit-distribution module: how value flows back to contributors, local partners and community projects.

This repository is the **interactive demo site**: a Next.js app with a fully simulated testnet, so anyone can create a split, send test payments, approve payouts and read the audit trail without a wallet or real funds.

- Project documentation: https://www.monark.io/en/project/fee-distribution-system
- Site plan (product brief, flows, copy, design decisions): [`docs/site-plan.md`](docs/site-plan.md)
- Image credits: [`docs/assets.md`](docs/assets.md)

> Testnet demo · not financial advice · no real funds. All data is simulated and stays in your browser.

## What you can do in the demo

1. **Connect a demo wallet** (sign or reject the sign-in request).
2. **Create a split** from a template or from scratch: fixed percentages or contribution points, optionally covering a cost first; approval threshold; automatic distribution. A live preview shows who gets what.
3. **Simulate a payment and distribute it**: watch the payment fan out to every recipient, with rounding dust handled exactly.
4. **Approve a large payout (2 of 3 signers) and freeze a split.**
5. **Read and export the audit log** (CSV), with a receipt for every payout.

Every transaction goes through a simulated wallet prompt, a pending state with a transaction hash, then confirmed or failed. Use **Demo controls** to slow the network, force the next transaction to fail, or reset the demo.

## Run it locally

Requirements: Node.js 22 and pnpm 10.

```bash
pnpm install
pnpm dev          # http://localhost:3000 (redirects to /en or /fr)
```

Checks:

```bash
pnpm lint
pnpm typecheck    # next typegen && tsc --noEmit
pnpm build && pnpm start
```

No environment variables are needed. `NEXT_PUBLIC_SITE_URL` optionally overrides the canonical URL used in metadata and the sitemap (default `https://splitflow.monark.io`).

### Screenshots

With a production server running (`pnpm build && pnpm start`), `pnpm screenshots` drives every page and key flow with Playwright at 390 and 1440 px, light and dark, in English (plus French checks) and writes PNGs to `docs/screenshots/`. Set `BASE_URL` if the server isn't on port 3000, and `ONLY=en-390-light` to run one variant.

## How the simulation works

Everything lives in `src/lib/demo/`, behind a small typed layer shaped like the real contract, so it can be swapped for wagmi/viem without touching the UI:

| File | Role |
|-|-|
| `types.ts` | Splits, recipients, rules, approvals, audit entries. Amounts are integer base units stored as strings (bigint-safe). |
| `allocate.ts` | The exact division: cover-first amount off the top, shares rounded down, rounding dust to the largest share. Lines always sum to the amount. |
| `ops.ts` | Pure state transitions for payment, distribution, approval, freeze and share updates, used by both the seed and live actions. |
| `chain.ts` | `useTx()`: wallet prompt → pending (1.2–2.4 s, 3–6 s on "slow network") → confirmed or reverted. |
| `store.ts` | External store persisted to `localStorage` (every access in try/catch; the demo still works if storage is blocked) and the wallet-prompt channel. |
| `seed.ts` | Three localized example splits with believable history: student-association sponsorships (2-of-3 approvals), a hackathon prize by contribution points (auto-distributed), and a co-op surplus with rent covered first. |
| `tokens.ts` | Testnet tokens (`tUSDC`, `tDAI`, `tETH`) with the Monark demo reference prices. |

## Project structure

```
src/
  proxy.ts                  locale redirect (/ → /en or /fr from Accept-Language)
  app/
    [locale]/               root layout (html lang, header, footer), home, 404
      app/                  demo: dashboard, new, split/[id]
      how-it-works/  credits/  pricing/ (internal, unlinked, noindex)
      opengraph-image.tsx
    sitemap.ts  robots.ts  icon.svg  globals.css (Monark 2026 tokens)
  components/
    ui/                     shadcn/ui + @monark/ui registry (wallet, connect-wallet, token-amount, network-badge, tx-status)
    site/                   Monark standard header, footer, brand, Demo chip, switches
    home/  diagrams/        hero fan, share bars, lifecycle diagram
    demo/                   app screens, wallet prompt, tx feedback, dialogs
  i18n/                     locale config, typed EN/FR dictionaries
  lib/demo/                 simulated chain and data layer
docs/                       site plan, assets, screenshots
scripts/screenshots.mjs     Playwright visual check
```

Built with Next.js (App Router, TypeScript strict), Tailwind CSS v4, shadcn/ui on the [Monark UI registry](https://ui.monark.io) and Lucide icons, following the Monark brand guidelines (cream and espresso themes, Nunito Sans, flat orange).

## Deploy to Vercel

Import the repository in Vercel and deploy with the defaults: framework Next.js, install `pnpm install`, build `pnpm build`. No `vercel.json` and no environment variables are required; the Node version comes from `engines` in `package.json`. Every page prerenders except splits created in the browser, which render on demand as a client shell.

## License and credits

Open source by the Monark community. Photos from Unsplash (free license), credited on `/credits` and in `docs/assets.md`.
