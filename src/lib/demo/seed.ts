import { seededAddress, seededHash } from "./ids"
import { applyApproval, applyDistribution, applyPayment, requestApproval, updateShares } from "./ops"
import { units } from "./tokens"
import type { DemoState, Signer, Split } from "./types"

/** Localized labels for the seeded example data (provided by the dictionaries). */
export interface SeedCopy {
  you: { name: string; role: string }
  automatic: string
  club: {
    name: string
    purpose: string
    events: string
    instructors: string
    prizes: string
    treasury: string
    treasurer: { name: string; role: string }
    vp: { name: string; role: string }
    payers: { northbridge: string; faculty: string; harbor: string }
  }
  hackathon: {
    name: string
    purpose: string
    organizers: string
  }
  coop: {
    name: string
    purpose: string
    rent: string
    growers: string
    bakery: string
    roaster: string
    fund: string
    payers: { august: string; september: string }
  }
}

export const YOU_ADDRESS = seededAddress("alex-martin-wallet")

export function youSigner(copy: SeedCopy): Signer {
  return { name: copy.you.name, role: copy.you.role, address: YOU_ADDRESS, isYou: true }
}

function base(partial: Pick<Split, "id" | "name" | "purpose" | "token" | "rule" | "recipients" | "coverFirst" | "approval" | "autoDistribute" | "createdAt">, copy: SeedCopy): Split {
  return {
    ...partial,
    status: "active",
    address: seededAddress(`split:${partial.id}`),
    owner: YOU_ADDRESS,
    balance: "0",
    received: "0",
    distributed: "0",
    earned: {},
    pending: null,
    log: [
      {
        id: `${partial.id}-created`,
        kind: "created",
        at: partial.createdAt,
        actor: copy.you.name,
        actorAddress: YOU_ADDRESS,
        hash: seededHash(`${partial.id}:created`),
      },
    ],
  }
}

export function createSeed(copy: SeedCopy, locale: "en" | "fr"): DemoState {
  const you = youSigner(copy)
  const byYou = (key: string, at: string) => ({ at, hash: seededHash(key), actor: you.name, actorAddress: you.address })
  const auto = (key: string, at: string) => ({ at, hash: seededHash(key), actor: copy.automatic, actorAddress: "" })

  // 1. Student association sponsorships: fixed shares, 2-of-3 approvals from 2,000 tUSDC.
  const treasurer: Signer = { ...copy.club.treasurer, address: seededAddress("ines-laurent") }
  let club = base(
    {
      id: "campus-sponsorships",
      name: copy.club.name,
      purpose: copy.club.purpose,
      token: "tUSDC",
      rule: "fixed",
      recipients: [
        { id: "events", label: copy.club.events, address: seededAddress("club-events"), share: 4000 },
        { id: "instructors", label: copy.club.instructors, address: seededAddress("club-instructors"), share: 3000 },
        { id: "prizes", label: copy.club.prizes, address: seededAddress("club-prizes"), share: 2000 },
        { id: "treasury", label: copy.club.treasury, address: seededAddress("club-treasury"), share: 1000 },
      ],
      coverFirst: null,
      approval: {
        threshold: units(2000, "tUSDC"),
        required: 2,
        signers: [
          you,
          treasurer,
          { ...copy.club.vp, address: seededAddress("samuel-okafor") },
        ],
      },
      autoDistribute: false,
      createdAt: "2026-08-18T14:05:00.000Z",
    },
    copy
  )
  club = applyPayment(club, units(1500, "tUSDC"), {
    at: "2026-08-25T15:12:00.000Z",
    hash: seededHash("club-p1"),
    actor: copy.club.payers.northbridge,
    actorAddress: seededAddress("northbridge"),
  })
  club = applyDistribution(club, byYou("club-d1", "2026-08-25T16:40:00.000Z"))
  club = applyPayment(club, units(3200, "tUSDC"), {
    at: "2026-09-02T18:45:00.000Z",
    hash: seededHash("club-p2"),
    actor: copy.club.payers.harbor,
    actorAddress: seededAddress("harbor"),
  })
  club = requestApproval(club, you, byYou("club-r2", "2026-09-03T09:10:00.000Z"))
  club = applyApproval(club, treasurer, { at: "2026-09-03T12:30:00.000Z", hash: seededHash("club-a2") })
  club = applyDistribution(club, byYou("club-d2", "2026-09-03T12:31:00.000Z"))
  club = applyPayment(club, units(750, "tUSDC"), {
    at: "2026-09-08T13:20:00.000Z",
    hash: seededHash("club-p3"),
    actor: copy.club.payers.faculty,
    actorAddress: seededAddress("faculty"),
  })
  club = applyDistribution(club, byYou("club-d3", "2026-09-09T10:02:00.000Z"))
  club = applyPayment(club, units(2500, "tUSDC"), {
    at: "2026-09-22T18:45:00.000Z",
    hash: seededHash("club-p4"),
    actor: copy.club.payers.northbridge,
    actorAddress: seededAddress("northbridge"),
  })

  // 2. Hackathon prize: contribution points, distributed automatically on receipt.
  let hack = base(
    {
      id: "ember-hackathon-prize",
      name: copy.hackathon.name,
      purpose: copy.hackathon.purpose,
      token: "tUSDC",
      rule: "points",
      recipients: [
        { id: "lea", label: "Léa Tremblay", address: seededAddress("lea-tremblay"), share: 30 },
        { id: "omar", label: "Omar Haddad", address: seededAddress("omar-haddad"), share: 30 },
        { id: "priya", label: "Priya Nair", address: seededAddress("priya-nair"), share: 20 },
        { id: "jonas", label: "Jonas Weber", address: seededAddress("jonas-weber"), share: 20 },
      ],
      coverFirst: null,
      approval: null,
      autoDistribute: true,
      createdAt: "2026-09-12T09:00:00.000Z",
    },
    copy
  )
  hack = updateShares(
    hack,
    hack.recipients.map((r) => ({ ...r, share: { lea: 34, omar: 28, priya: 22, jonas: 16 }[r.id] ?? r.share })),
    byYou("hack-points", "2026-09-13T21:40:00.000Z")
  )
  hack = applyPayment(hack, units(5000, "tUSDC"), {
    at: "2026-09-14T19:30:00.000Z",
    hash: seededHash("hack-p1"),
    actor: copy.hackathon.organizers,
    actorAddress: seededAddress("hackathon-organizers"),
  })
  hack = applyDistribution(hack, { ...auto("hack-p1", "2026-09-14T19:30:00.000Z"), auto: true })

  // 3. Local co-op surplus: rent covered first, then fixed shares. One payment waiting.
  let coop = base(
    {
      id: "market-street-coop",
      name: copy.coop.name,
      purpose: copy.coop.purpose,
      token: "tDAI",
      rule: "fixed",
      recipients: [
        { id: "growers", label: copy.coop.growers, address: seededAddress("coop-growers"), share: 4500 },
        { id: "bakery", label: copy.coop.bakery, address: seededAddress("coop-bakery"), share: 2500 },
        { id: "roaster", label: copy.coop.roaster, address: seededAddress("coop-roaster"), share: 2000 },
        { id: "fund", label: copy.coop.fund, address: seededAddress("coop-fund"), share: 1000 },
      ],
      coverFirst: { label: copy.coop.rent, address: seededAddress("coop-rent"), amount: units(350, "tDAI") },
      approval: null,
      autoDistribute: false,
      createdAt: "2026-07-30T12:00:00.000Z",
    },
    copy
  )
  coop = applyPayment(coop, units(1240.5, "tDAI"), {
    at: "2026-08-31T22:00:00.000Z",
    hash: seededHash("coop-p1"),
    actor: copy.coop.payers.august,
    actorAddress: seededAddress("coop-till"),
  })
  coop = applyDistribution(coop, byYou("coop-d1", "2026-09-01T08:15:00.000Z"))
  coop = applyPayment(coop, units(980, "tDAI"), {
    at: "2026-09-27T21:30:00.000Z",
    hash: seededHash("coop-p2"),
    actor: copy.coop.payers.september,
    actorAddress: seededAddress("coop-till"),
  })

  // Stable ids for the seeded log entries (ops use random ids).
  for (const s of [club, hack, coop]) s.log = s.log.map((e, i) => ({ ...e, id: `${s.id}-log-${s.log.length - i}` }))

  return {
    version: 1,
    seededLocale: locale,
    wallet: { status: "disconnected", address: YOU_ADDRESS, name: copy.you.name, lastError: null },
    splits: [club, hack, coop],
    settings: { slow: false, failNext: false },
  }
}

export const SEED_SPLIT_IDS = ["campus-sponsorships", "ember-hackathon-prize", "market-street-coop"]
