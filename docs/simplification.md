# Simplification pass

Owner feedback: *"Simplify, reduce text quantity, revise flows so that context is only given when necessary. Two top bars on homepage is too busy; demo banners only on demo/app pages."*

Binding rules: `monark-brand-guidelines.md` §8 "Restraint", §10 and §11. Method: the TrustRate pilot (`sites/address-review-system/docs/simplification.md`, §4 checklist). Splitflow's header and footer were already the §10 reference implementation (`src/components/site/`), so the shell changes here are limited to the Demo chip tint and the footer legal band.

How the numbers are measured (run against `pnpm start -p 3133`):

- `node scripts/wordcount.mjs`: words per page, English, 1440px. *Visible* is the `innerText` of `<main>`; *total* also counts closed disclosures and FAQ answers; *chrome* is everything outside `<main>` (header, footer). The app bar sits inside `<main>`. App pages include seeded data (split names, purposes, recipients, activity).
- `node scripts/dictcount.mjs`: words of UI copy in `src/i18n/dictionaries/{en,fr}.ts`, per section.

## 1. Before

| Page | Visible | Total (incl. collapsed) | Chrome |
|-|-:|-:|-:|
| Home | 419 | 557 | 76 |
| How it works | 669 | 663 | 76 |
| Credits | 120 | 120 | 76 |
| 404 | 31 | 31 | 76 |
| App: connect gate | 63 | 63 | 76 |
| App: dashboard | 231 | 231 | 78 |
| App: create a split | 185 | 185 | 78 |
| App: split (co-op) | 162 | 187 | 78 |
| App: split (club) | 137 | 157 | 78 |
| **Total** | **2,017** | **2,194** | **692** |

Dictionary copy: **EN 2,669 words**, **FR 2,905 words**.

What was loaded:

- **Shell:** the testnet line ("Testnet demo · not financial advice · no real funds") appeared in the footer on every page, under the home hero buttons, in the app strip, in the composer, in the simulate dialog, on the split page's action card and in the wallet prompt: seven places for one notice. Demo chip at 15% tint in light mode (fails AA).
- **Home:** hero eyebrow, a 25-word subline, 5 sections after the hero (outcomes, rules, who, FAQ, closing), two dividers. The outcomes restated the hero and the rules. Six FAQ questions, two of them mechanics (what is a split, rounding dust).
- **How it works:** eyebrow, a 40-word intro, 15–20-word step bodies, 30–50-word paragraphs for dust, approvals, freeze and the audit trail, the contract interface and data-layer notes always open.
- **App:** two rows in the strip (network badge, testnet line, Demo controls). Connect gate with a 28-word paragraph and three feature bullets. Dashboard greeting ("Signed in as…", repeated from the header wallet chip) and a USD note. Composer intro paragraph, back link, five hint lines, preview and deploy in two cards. Split page: back link, network badge (again), "You own this split", "Nothing is waiting…" line plus a "Nothing to distribute" reason, an auto-distribute line (repeating the header badge), a frozen banner plus a frozen reason line, a pending reason plus the approvals card. Toasts for deploy, distribute, propose, approve, freeze, unfreeze and auto-distributed payments, each repeating what the screen already showed.

## 2. What changed

No feature or flow was removed.

### Shell
- **Demo chip:** `bg-primary/8 dark:bg-primary/15` (was `/15` in both). The header and mobile menu are otherwise unchanged and remain the reference implementation.
- **Footer:** testnet line removed from the legal band (it keeps "Demo · simulated data"); product line 16 → 10 words.
- **Marketing pages:** one top bar (the header); the testnet line under the hero is gone.

### Home (hero + 5 sections → hero + 4)
- Hero: no eyebrow; subline 25 → 14 words; secondary CTA "See how it works" → "How it works".
- **Removed "Outcomes"**: outcome 1 repeated the hero; "receipt" is in the subline; "can't drain the pot" became the FAQ "Who can stop a payout?".
- Rules: no eyebrow; one 12-word line that also answers "What is a split?"; card text 5–9 words, the share bars kept.
- Who: no eyebrow; card lines 13–15 → 8–9 words.
- FAQ: 6 → 4 questions, answers 12–16 words. "What is a split" moved into the rules line; "rounding dust" is on `/how-it-works`; "Who can freeze" merged into "Who can stop a payout?".
- Closing: heading + button. One divider (before the FAQ) instead of two.

### How it works
- No eyebrow; intro 40 → 9 words. Step bodies 7–9 words. Rule bodies, dust, approvals, freeze and audit reduced to one line each.
- For developers: one line + a "Show the contract interface" disclosure holding the interface and the data-layer notes (context on demand). CTA: heading + button.

### Credits and 404
- Credits: intro 25 → 8 words; "Used on the home page" under each photo became one line above them; brand line shortened.
- 404: body line 17 → 7 words.

### App
- **One compact bar:** a back link to "Your splits" on inner pages, and one pill "● Sepolia testnet" that opens Demo controls. The testnet line and the duplicate back links inside the pages are gone.
- **Testnet line once per transaction:** only in the wallet prompt, for transactions that move value. Removed from the app bar, composer, simulate dialog and split actions.
- Connect gate: body 28 → 8 words; the three feature bullets removed.
- Dashboard: removed the greeting (the header wallet chip shows the name) and the visible USD note (kept as the stats' accessible label); recent activity shows 5 entries (was 7); empty states are one line plus the action.
- Create a split: removed the intro and the token hint; the rule-card hints and the cover-first hint moved into an info popover next to "How to split" (with a link to `/how-it-works`); the auto-distribute hint moved into an info popover; the signers line only shows once approvals are switched on. Preview and deploy are one card.
- Split page: removed the network badge (it is in the app bar and the Rule & safety tab), "You own this split", the "Nothing is waiting" line, the auto-distribute line (the header badge says it) and the frozen/pending reason lines (the frozen banner and the approvals card say it). Frozen banner 17 → 9 words, approvals line 14 → 7.
- Simulate dialog: description 15 → 7 words; frozen and approval notes 5–6 words.
- Demo controls: hints 4–5 words; reset confirmation 14 → 8.
- **One message, once:** no toast on deploy (the new split's page opens), distribute and auto-distribute (the fan-out stamps each line "Paid"), propose (the approvals card appears), approve (the signer's badge or the fan-out), freeze/unfreeze (badge and banner). Kept: "Payment received.", "Shares updated.", "Demo reset.".
- New shared component: `src/components/ui/info-tip.tsx` (copied from the pilot: Radix Popover behind an info icon, works on touch).

French was rewritten to the same brevity in `src/i18n/dictionaries/fr.ts`; unused keys were removed from both dictionaries.

## 3. After

| Page | Visible before | Visible after | Change | Total before | Total after | Chrome before | Chrome after |
|-|-:|-:|-:|-:|-:|-:|-:|
| Home | 419 | 210 | −50% | 557 | 264 | 76 | 62 |
| How it works | 669 | 296 | −56% | 663 | 447 | 76 | 62 |
| Credits | 120 | 80 | −33% | 120 | 80 | 76 | 62 |
| 404 | 31 | 21 | −32% | 31 | 21 | 76 | 62 |
| App: connect gate | 63 | 21 | −67% | 63 | 21 | 76 | 62 |
| App: dashboard | 231 | 174 | −25% | 231 | 174 | 78 | 64 |
| App: create a split | 185 | 91 | −51% | 185 | 91 | 78 | 64 |
| App: split (co-op) | 162 | 138 | −15% | 187 | 163 | 78 | 64 |
| App: split (club) | 137 | 113 | −18% | 157 | 133 | 78 | 64 |
| **Total** | **2,017** | **1,144** | **−43%** | **2,194** | **1,394** | **692** | **566** |

Marketing pages (home, how it works, credits, 404): 1,239 → 607 visible words (−51%). What remains on the split pages is mostly data (recipient names, amounts, addresses).

Dictionary copy: **EN 2,669 → 1,864 (−30%)**, **FR 2,905 → 2,073 (−29%)**. Per section (EN): common 148 → 127 · home 577 → 292 · how 475 → 259 · credits 89 → 59 · app 975 → 722 · meta 140, pricing 177 (internal, unlinked) and seed 87 unchanged.

### Screenshots

- Before: `docs/screenshots/before/en-1440-light-page-home.png`, `docs/screenshots/before/en-1440-light-flow2-composer-filled.png`.
- After: `docs/screenshots/en-1440-light-page-home.png`, `docs/screenshots/en-1440-light-flow2-composer-filled.png`, and every page and flow step in `docs/screenshots/` (EN 390/1440 light/dark, FR 390/1440 light).
