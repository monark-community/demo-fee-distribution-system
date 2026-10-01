# Splitflow by Monark: site plan

Status: shipped on `develop`. This plan describes what the site does; it is kept in sync with the code.

- Product: **Splitflow**, Monark's payments / profit-distribution module.
- Authoritative description: https://www.monark.io/en/project/fee-distribution-system
- Branding: **Monark-branded** (`true`). `lovable-migration/monark-brand-guidelines.md` is binding.
- Stack: Next.js 16 (App Router, `src/`, TypeScript strict), pnpm, Tailwind CSS v4, shadcn/ui on the Monark UI registry, `lucide-react`.

---

## 1. Product brief

**Target user.** The person in a Monark community who receives shared money and has to pay it out fairly:

- the treasurer of a student blockchain association that receives sponsorships;
- a hackathon team that wins a prize and has to split it among its members;
- the coordinator of a local co-op or partner business sharing a monthly surplus;
- a DAO working-group lead paying contributors from a budget.

Secondary users are the **recipients** (they want to see what they are owed and prove they were paid) and **students and developers** learning how a revenue-splitting smart contract works (Monark's education mission).

**Core job to be done.** *"When money comes in for a group, pay everyone their agreed share, right away, and be able to prove it later, without one person holding the money or the spreadsheet."*

**Domain concepts** (each one is explained in plain words the first time the site uses it):

| Concept | Meaning in Splitflow |
|-|-|
| Split | A small smart contract with its own address. Money sent to it is divided by its rule. |
| Recipient | A wallet address with a label ("Workshop instructors") and a share. |
| Rule | How money is divided. Three kinds: **fixed percentages**, **contribution points** (shares follow points, e.g. hours or tasks), and **cover a cost first** (a fixed amount off the top, then the rule applies to the rest). |
| Payment | Money arriving at the split's address (an inflow). |
| Distribution | The transaction that pays every recipient their part of what is waiting in the split. It is either automatic on receipt or triggered by hand. |
| Rounding dust | The indivisible leftover (a few base units) when an amount doesn't divide exactly. Splitflow gives it to the largest share and shows it. |
| Approval threshold | Distributions at or above an amount need more than one signature (e.g. 2 of 3 officers). |
| Freeze | An emergency stop: payments are still received but nothing is paid out until the split is unfrozen. |
| Audit log | Every event (created, payment received, approval, distribution, freeze, rule change) with time, actor and transaction hash, exportable to CSV. |

**What the Lovable version got wrong or left out.**

- It was a generic landing page on a purple-to-blue gradient with frosted cards: nothing Monark about it, and nothing specific to sharing money in a community.
- The dashboard only appeared after creating a split, and its numbers were hard-coded ("4.6 ETH", every recipient "1.2 ETH received"). Nothing ever moved.
- No simulation at all, although "configure, simulate and track" is the heart of the brief. No payment arriving, no distribution, no pending, confirmed or failed state.
- Only fixed percentages; the documented dynamic rules (points, cover-first) were absent. Percent inputs accepted anything, addresses weren't validated, recipients with missing names were silently dropped.
- No audit log, no approval or freeze (both in the documented milestones), no recipient view.
- English only, no disclaimers, nothing persisted, a white "🚧" banner stuck over the content.

## 2. Value proposition

**Splitflow gives Monark communities one shared address that splits every incoming payment among its contributors the moment it lands, with a public receipt, so nobody has to hold the money, chase transfers or trust one person's spreadsheet.**

Supporting benefits, as outcomes:

1. **Everyone is paid when the money arrives**, not when the treasurer finds an evening to send ten transfers.
2. **Nobody argues about who got what.** The rule is visible to all, every payout has a receipt, and the whole history exports to CSV.
3. **A single mistake or bad actor can't drain the pot.** Large payouts need several signatures, and anyone with authority can freeze the split.

## 3. Hero

- **Headline** (8 words): *Every payment, shared fairly the moment it lands.*
  FR: *Chaque paiement, partagé équitablement dès son arrivée.*
- **Subheadline:** *One address that pays every contributor their share, with a receipt anyone can check.*
  FR: *Une seule adresse qui verse à chacun sa part, avec un reçu vérifiable par tous.*
- No eyebrow, no disclaimer line under the buttons (brand guidelines §8 "Restraint"; see `docs/simplification.md`).
- **Primary CTA:** "Launch the demo" / « Lancer la démo » → `/{locale}/app`.
- **Secondary CTA:** "How it works" / « Fonctionnement » → `/{locale}/how-it-works`.
- **Visual:** the **live split diagram**, built in code (SVG + React): a 2,500 tUSDC sponsorship payment enters from the left as one orange line and fans out into four lines whose thickness is each recipient's share, ending in four recipient rows whose amounts count up. It loops calmly (every ~6 s) with a "Payment received → Distributing → Paid" state line. Product UI over photos because the diagram *is* the product's idea: one payment in, many fair payments out. The mesh butterfly sits large and cropped behind it (see §8).

## 4. Page map

All routes live under `/{locale}` (`en`, `fr`). `/` and any locale-less path redirect to the visitor's preferred language (fallback English) via `src/proxy.ts`.

| Route | Purpose | Sections, in order |
|-|-|-|
| `/{locale}` | Home: explain the idea in 30 seconds and send people into the demo. | Hero with live split diagram · Three rules (fixed, points, cover-first) with mini share bars · Who it's for (3 photo cards: student association, hackathon team, local co-op) · FAQ (4 questions) · Closing call to action (heading + button) |
| `/{locale}/app` | The interactive demo: dashboard of your splits. | Connect gate (when disconnected) · Summary strip (received, distributed, waiting, active splits) · Your splits (rows with share bars) · Recent activity (last 5) |
| `/{locale}/app/new` | Create a split. | Templates · Name & token · Rule (rule details in an info popover) · Recipients with live share bar · Safety (approvals, auto-distribute) · One card: live preview "If X arrives" + Deploy |
| `/{locale}/app/split/[id]` | One split: its flow, recipients, activity and settings. | Header (status and rule badges, name, contract address, creation date) · Received / distributed / waiting · Flow panel (waiting balance fanning out to recipients) · Pending approvals · Actions (simulate a payment, distribute or propose, freeze, update shares) · Tabs: Recipients, Activity (audit log + receipts + CSV), Rule & safety |
| `/{locale}/how-it-works` | For students, developers and careful treasurers: the mechanics. Justified because Monark's audience includes students learning how the contract works, and the documentation page frames the project as a Solidity + dashboard build. | One-line intro · The life of a payment (diagram) · The three rules with a worked 2,500 tUSDC example and rounding dust · Approvals and freeze · The audit trail · For developers (one line; contract interface and data-layer notes behind a "Show the contract interface" disclosure) · Call to action |
| `/{locale}/credits` | Photo, font and icon credits (required by the asset rules). | Photos · Type and icons · Monark brand assets |
| `/{locale}/pricing` | **Internal strategy review only.** Never linked, excluded from the sitemap, `noindex, nofollow`. | Price card "Free, part of Monark" · What you pay (gas only, 0% protocol fee) · Partner deployments · Reasoning |
| 404 | Friendly not-found with the vertical Monark logo and links home and to the demo. | |

**Header** (standard Monark shell, brand guidelines §10): butterfly mark + "Splitflow" brand → home (no "by Monark" in the header) · links left-aligned after the brand: *Overview*, *How it works*, *Demo* (active one in foreground) · right side: Demo chip · EN/FR switch · theme toggle · primary *Launch demo*. Inside `/app` the primary action becomes the `connect-wallet` component. Demo chip tint: `primary` at 8% in light mode, 15% in dark.

**App bar** (inside `/app` only, one compact 48px row under the header): a "← Your splits" link on inner pages, and one pill "● Sepolia testnet" that opens Demo controls (slow network, fail the next transaction, reset). No testnet line: it appears only in the wallet prompt. Below `lg`: brand + menu button opening a full-height sheet with the links, Demo chip, EN/FR, theme toggle and action.

**Footer** (three bands): product line + links (Overview, How it works, Demo, Credits) · "Splitflow is built by Monark", Monark logo + tagline, links to the project page on monark.io and the GitHub repo, social icons · "© {year} Monark · Open source", "Demo · simulated data", photo credits link. No testnet line in the footer.

## 5. Feature highlights

| Feature | User benefit | Where it appears | Proven by flow |
|-|-|-|-|
| Instant split on receipt | Contributors are paid when money lands | Home hero diagram; split page flow panel | Flow 3 |
| Three rule types (fixed, points, cover-first) | The rule matches how the group actually agreed to share | Home "rules" section; `/how-it-works`; composer | Flow 2 |
| Live simulation | See exactly who gets what before any money moves | Composer preview; "Simulate a payment" dialog | Flows 2, 3 |
| Approvals for large payouts | No single person can move a big sum alone | Home FAQ; `/how-it-works`; split page | Flow 4 |
| Emergency freeze | Stop payouts instantly if something looks wrong | Split page actions; `/how-it-works` | Flow 4 |
| Audit log and CSV export | Anyone can check every payout later | Split page Activity tab; dashboard activity | Flow 5 |

## 6. Key flows

All transactions go through a simulated wallet prompt ("Confirm in your wallet": action summary, estimated network fee, the testnet disclaimer for value-moving transactions (the only place it appears), *Confirm* / *Reject*), then a pending state with a transaction hash (1.2–2.4 s, 3–6 s on "slow network"), then confirmed or failed. The demo controls let a visitor make the next transaction fail on-chain, and rejecting in the wallet prompt always produces the "rejected" failure.

1. **Connect a wallet.** Visitor opens `/app` → "Connect demo wallet" → wallet prompt "Sign in to Splitflow" → *pending* ("Waiting for signature…") → *connected*: header shows the `connect-wallet` chip (Jazzicon + `0x7a3F…c19E`). *Failed*: rejecting shows "You declined the sign-in request. Nothing was shared." with a retry.
2. **Create a split and simulate it.** `/app/new` → pick a template or start blank → name, token (tUSDC, tDAI, tETH) → rule (fixed percentages / contribution points, optional cover-a-cost-first) → recipients (label, address validated as `0x` + 40 hex, share) → the share bar shows unallocated space hatched until the total is exactly 100% (or any points total) → optional approval threshold and auto-distribute → the preview shows what each recipient would get from an editable amount → *Deploy split* → wallet prompt → *pending* ("Deploying your split…", hash shown) → *confirmed*: redirect to the new split (the page is the confirmation; no toast). *Failed*: "The deployment failed (out of gas on the simulated network). Nothing was created." with *Try again*; form stays filled.
3. **Receive a payment and distribute it.** On a split → *Simulate a payment* → choose a payer (e.g. "Northbridge Labs, sponsor") and amount, see the per-recipient preview → *Send test payment* → *pending* → *confirmed*: waiting balance rises. If auto-distribute is on, a distribution transaction starts by itself; otherwise *Distribute now* → wallet prompt → *pending*: the flow panel animates the balance streaming to each recipient → *confirmed*: each recipient line shows "Paid" with its amount, the receipt appears in Activity (no toast: the fan-out is the confirmation). *Failed*: "Distribution failed. The funds are still in the split; nobody was paid twice." with *Retry*.
4. **Approve a large payout, then freeze.** On the club split (threshold 2,000 tUSDC, 2 of 3 signers) → distribute 2,500 → the distribution waits as "Needs 2 of 3 approvals" with your signature already counted → *Approve as Inès (simulated)* (a co-signer approves from their own wallet, so there is no prompt for you) → *pending* → *confirmed*: the last approval executes the payout in the same transaction (fan-out and stamped receipt as in flow 3). Then *Freeze split* → wallet prompt → *pending* → *frozen*: status badge "Frozen", distribute and approve disabled with the reason, incoming payments still accepted and shown as "held". *Unfreeze* reverses it. Failed variants as above.
5. **Audit and export.** Split → *Activity* tab → filter (all, payments, distributions, approvals, safety) → every row has time (locale format), actor, amount and a transaction hash → *Export CSV* downloads the log. Empty state on a new split: "Nothing yet. Simulate a payment."

## 7. Content (EN / FR)

The shipped copy lives in `src/i18n/dictionaries/en.ts` and `fr.ts` (typed; French must satisfy the English shape). Draft copy below is what those files contain for the main sections.

### Home

| Slot | English | Français |
|-|-|-|
| H1 | Every payment, shared fairly the moment it lands. | Chaque paiement, partagé équitablement dès son arrivée. |
| Sub | One address that pays every contributor their share, with a receipt anyone can check. | Une seule adresse qui verse à chacun sa part, avec un reçu vérifiable par tous. |
| CTAs | Launch the demo · How it works | Lancer la démo · Fonctionnement |
| Rules H2 + line | Share the way your group agreed. A split is a small contract with its own address. Pick its rule. | Partagez comme votre groupe l'a décidé. Un partage est un petit contrat doté de sa propre adresse. Choisissez sa règle. |
| Rule: fixed | **Fixed percentages.** Best when roles are stable. | **Pourcentages fixes.** Idéal quand les rôles sont stables. |
| Rule: points | **Contribution points.** Shares follow hours, tasks or commits. | **Points de contribution.** Les parts suivent les heures, les tâches ou les commits. |
| Rule: cover-first | **Cover a cost first.** Rent comes off the top, then the rest is shared. | **Couvrir un coût d'abord.** Le loyer d'abord, puis le reste est partagé. |
| Who H2 | Built for groups that build together | Pensé pour les groupes qui bâtissent ensemble |
| Student associations | Sponsorship money reaches every team the day it arrives. | L'argent des commanditaires rejoint chaque équipe le jour même. |
| Hackathon teams | Split the prize by points before everyone flies home. | Partagez le prix selon les points avant que chacun reparte. |
| Local co-ops and partners | Cover the rent, then share the monthly surplus. | Couvrez le loyer, puis partagez le surplus du mois. |
| Closing | Set up your first split in two minutes. / Launch the demo | Créez votre premier partage en deux minutes. / Lancer la démo |

**FAQ** (the only FAQ on the site; mechanics such as rounding dust live on `/how-it-works`)

1. *Is this real money?* No. It's a testnet demo: no real funds, and nothing leaves your browser. / *Est-ce de l'argent réel ?* Non. C'est une démo sur testnet : aucun fonds réel, et rien ne quitte votre navigateur.
2. *Can I change the shares later?* Yes. The change is logged and applies to money received after it. / *Puis-je modifier les parts plus tard ?* Oui. Le changement est inscrit au journal et s'applique à l'argent reçu ensuite.
3. *Who can stop a payout?* Large payouts wait for several signatures, and the owner or an approver can freeze the split. / *Qui peut bloquer un versement ?* Les gros versements attendent plusieurs signatures, et le propriétaire ou un approbateur peut geler le partage.
4. *Does Splitflow take a cut?* No. Recipients get 100% of their share; a real network charges only gas. / *Splitflow prend-il une commission ?* Non. Chacun reçoit 100 % de sa part ; un vrai réseau ne facture que le gas.

### App: key strings

| Slot | English | Français |
|-|-|-|
| Connect gate | Connect a demo wallet to open your splits. A simulated wallet: nothing is signed for real. | Connectez un portefeuille de démo pour ouvrir vos partages. Un portefeuille simulé : rien n'est signé pour de vrai. |
| Summary | Received · Distributed · Waiting in splits · Active splits | Reçu · Versé · En attente · Partages actifs |
| Empty dashboard | No splits yet. + *Create a split* | Aucun partage pour l'instant. + *Créer un partage* |
| Wallet prompt | Confirm in your wallet · Estimated network fee · Confirm · Reject | Confirmez dans votre portefeuille · Frais de réseau estimés · Confirmer · Refuser |
| Disclaimer (wallet prompt only) | Testnet demo · not financial advice · no real funds | Démo sur testnet · ceci n'est pas un conseil financier · aucun fonds réel |
| Pending | Waiting for the network… | En attente du réseau… |
| Rejected | You rejected the request in your wallet. Nothing was sent. | Vous avez refusé la demande dans votre portefeuille. Rien n'a été envoyé. |
| Frozen | Frozen: payments are held and nothing is paid out. | Gelé : les paiements sont retenus et rien n'est versé. |
| Activity empty | Nothing yet. Simulate a payment. | Rien pour l'instant. Simulez un paiement. |
| Unknown split | We couldn't find this split. It may have been removed when the demo was reset. | Ce partage est introuvable. Il a peut-être disparu lors de la réinitialisation de la démo. |
| Storage error | Local storage is blocked: your changes won't be kept. | Stockage local bloqué : vos changements ne seront pas conservés. |

The complete list (form validation, demo controls, tabs, toasts, how-it-works and credits copy) is in the dictionaries.

## 8. Aesthetics (within the Monark guidelines)

Colour, type, logo, header and footer are fixed by the guidelines: cream / espresso tokens derived from `#f88d10` with `--surface-tint: 1` (§3 token block, since `theme-2026.json` is not yet published), Nunito Sans 400/600/700/800, pill actions, 1rem cards, borders not shadows, flat orange only.

- **Layout and rhythm.** Home alternates one wide statement band with one dense band: hero (asymmetric, copy left, diagram right on desktop; stacked on mobile) → rules (three cards each with a real mini share bar) → photo cards → FAQ (single column, 68ch) → closing band. The branded section divider (thin orange line, outlined circles) appears once, before the FAQ. The app is a working tool: a dense two-column layout on desktop (content + activity rail), single column on mobile, generous touch targets, sticky preview in the composer.
- **Hero visual.** The live split diagram (see §3).
- **Mesh butterfly.** Used once, on the home hero, large and cropped off the right edge at low opacity behind the diagram, flat orange lines. Not used anywhere else.
- **Illustrations.** No reused Monark decorative illustrations beyond the mesh butterfly; the site draws its own flat orange line-art: the split fan (hero and split page), the "life of a payment" diagram and the approval diagram on `/how-it-works`. No gradients, no glows.
- **Photography direction.** Warm, natural-light photos of real groups working together (students in a lecture hall, a small team in a café, a community market), all with the same warm grade that sits on cream and espresso. Used only in the "who it's for" section, always paired with a line of copy and an example rule.
- **Signature moments.**
  1. **The fan-out.** A payment visibly splits into streams whose thickness is each share; amounts tick up at the ends. Hero, and live on the split page during a distribution.
  2. **The settling share bar.** In the composer, the share bar shows unallocated space as hatched; as shares reach exactly 100% the hatch closes and the total label settles to "Ready to deploy".
  3. **The stamped receipt.** When a distribution confirms, each recipient line flips to "Paid" in sequence (150 ms apart), leaving a receipt in the activity log.
- All motion 150–250 ms ease-out (the hero loop and fan-out are slower, explanatory), and everything respects `prefers-reduced-motion` (the diagram renders in its final state).

## 9. Assets

| Asset | Purpose | Placement |
|-|-|-|
| `public/images/students.jpg` (Unsplash, Vitaly Gariev) | Student association use case | Home "who it's for" |
| `public/images/team.jpg` (Unsplash, Brooke Cagle) | Hackathon / small team use case | Home "who it's for" |
| `public/images/market.jpg` (Unsplash, Kyle Nieber) | Local co-op use case | Home "who it's for" |
| `public/brand/*` Monark logos (standalone, horizontal light/dark, vertical) | Header brand, footer, 404, favicon | Shell |
| `public/brand/monark-mesh.svg` | Home hero decoration | Home hero only |
| `public/brand/socials/*.svg` | Footer social icons | Footer |
| Open Graph image | Generated with `next/og` per locale | Metadata |

Icons: Lucide only. Diagrams: built in JSX/SVG (split fan, payment lifecycle, approvals). Full credits in `docs/assets.md` and on `/credits`.

## 10. Pricing strategy

Splitflow is **free, included in the Monark bundle**. Reasons: it is community infrastructure Monark uses to "redistribute value through community ownership, local partnerships and contributor rewards"; a fee on money that is itself being shared would undercut the product's trust promise; and it is open source. Recipients get 100% of their share (0% protocol fee); on a real network the only cost is gas. For partners that need a supported deployment (custom chain, onboarding, audit review), Monark handles it through its partnership programme, not a price list.

A designed `/{locale}/pricing` page exists **for internal review only**: not linked anywhere, excluded from `sitemap.xml`, `robots: { index: false, follow: false }`. No other page mentions prices.

## 11. Out of scope

- Real wallets, chains, signing or tokens (no wagmi/viem; the data layer in `src/lib/demo/` is shaped so it could be swapped in).
- Streaming (per-second) payments and recurring schedules: documented as a planned milestone on monark.io; the demo offers "distribute on receipt" or "by hand" only.
- Multi-owner split management, recipient accounts, notifications, fiat on/off-ramps, tax reporting.
- Changing a split's rule type, token or recipient list after creation. Only the shares can be updated ("Update shares", recorded in the audit log), which is what the contribution-points rule needs.
- A `/brand` page, a blog, or any backend.

## 12. Implementation notes (as shipped)

- `theme-2026.json` is not published on ui.monark.io yet, so `theme.json` was installed and the guidelines' §3 token block pasted over it in `src/app/globals.css`, plus muted `--success` / `--warning` status colours (always paired with a text label).
- The `connect-wallet` registry item's bare `wallet` dependency doesn't resolve through the shadcn CLI, so its source was copied verbatim from the registry JSON. Registry components were restyled to pills and given localizable labels (copy, close, status).
- Dependencies beyond the stack: `next-themes` (theme toggle without a flash), `sonner` (toasts), `react-jazzicon` (required by the registry `wallet`); `playwright` as a dev dependency for `pnpm screenshots`. No recharts: the only chart-like elements are share bars drawn in code.
- The FAQ and the developer disclosure on `/how-it-works` use native `<details>` (no JavaScript). Context on demand in the app uses `src/components/ui/info-tip.tsx` (Radix Popover, works on touch).
- Simplification pass (brand guidelines §8 "Restraint"): see `docs/simplification.md` for before/after word counts and what was cut or moved. `scripts/wordcount.mjs` and `scripts/dictcount.mjs` measure it. Seeded example data is created in the visitor's language on first load and on "Reset demo".
- Screenshots live in `docs/screenshots/`: every page and flow at 390 and 1440 px, light and dark, in English; home, dashboard, composer and one payout flow in French.
