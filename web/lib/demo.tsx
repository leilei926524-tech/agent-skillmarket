"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

/* ─────────────────────────── types ─────────────────────────── */

export type Skill = {
  id: string;
  name: string;
  expert: string;
  bio: string; // one-line résumé shown under the avatar
  verified: boolean;
  priceJpy: number;
  rating: number;
  calls: number;
  category: string;
  blurb: string;
  minted?: string; // set when converted from a human task
  isNew?: boolean;
};

/* real-photo headshots (randomuser.me portrait library) — fixed index per
   expert so avatars are stable; gender matched to the persona name.
   Components fall back to initials when offline. */
/* hand-picked from the full library: md5-deduped (the library itself has 17
   duplicate index pairs, e.g. women 33/56 are one photo) and face-matched to
   each persona (JP personas get Asian faces, age/vibe aligned) */
const PORTRAIT: Record<string, string> = {
  s1: "men/69",   // Salehin R. — analyst in a suit
  s2: "women/2",  // M. (Mika) Tanaka — warm CS smile
  s3: "men/4",    // A. Fujimori
  s4: "men/49",   // D. Okafor — GRC, suit
  s5: "women/78", // Y. Park
  s6: "men/26",   // R. Ito — 税理士 in glasses
  s7: "men/92",   // K. Watanabe — compliance, glasses
  s8: "men/90",   // Chen Wei — young engineer
  s9: "women/51", // S. Nakamura — SRE lead
  s10: "men/5",   // P. Sharma
  s11: "women/3", // L. Müller
  s12: "women/60",// Aoi K. — creator
  s13: "men/95",  // J. Rivera
  s14: "women/23",// E. Goldberg — lawyer in blazer
  s15: "women/83",// H. Yamamoto — retired engineer, the flywheel face
  s16: "women/91",// T. Ogawa — Osaka chef
  s17: "women/27",// M. Suzuki
  s18: "men/44",  // F. Dubois
  s19: "women/36",// N. Okonkwo — coach
};
export const avatarUrl = (id: string) =>
  `https://randomuser.me/api/portraits/${PORTRAIT[id] ?? `men/${(seed0(id) % 90) + 1}`}.jpg`;
const seed0 = (id: string) =>
  [...id].reduce((a, c) => a + c.charCodeAt(0), 0);

export type AuditRow = {
  id: string;
  ts: number;
  kind: "invoke" | "payout" | "task" | "mint";
  agent: string;
  skillName: string;
  gross: number; // what the agent paid
  net: number; // what the expert earned (85%)
  tx: string;
  note?: string;
};

export type Toast = { id: string; title: string; body: string; kind: string };

export type HumanTaskStatus =
  | "hidden"
  | "gap"
  | "matched"
  | "offer_sent"
  | "accepted"
  | "delivered";

export type DemoState = {
  skills: Skill[];
  audit: AuditRow[];
  toasts: Toast[];
  balance: number; // seller wallet (Salehin)
  lifetime: number;
  invoking: boolean; // hero card overlay
  answerShown: boolean; // guardrail answer revealed
  humanTask: HumanTaskStatus;
  ambient: boolean;
  seen: string[]; // event ids already applied (BroadcastChannel dedupe)
  resets: number; // bumps on R so pages can clear their local UI state
};

type Ev =
  | { id: string; t: "invoke_hero_start" }
  | { id: string; t: "invoke_hero_settle" }
  | { id: string; t: "ambient"; skillId: string; agent: string }
  | { id: string; t: "hire_advance" }
  | { id: string; t: "mint" }
  | { id: string; t: "toggle_ambient" }
  | { id: string; t: "dismiss_toast"; toastId: string }
  | { id: string; t: "reset" }
  | { id: string; t: "hydrate"; snap: DemoState };

/* ─────────────────────────── seed data ─────────────────────────── */

export const HERO_ANSWER = [
  "Recommendation: do not auto-approve 35%.",
  "Ceiling is 25%, and only against a 24-month prepaid term — every point above 25% is roughly 1.8pts of gross margin, so it gets traded, never given away.",
  "Policy gate: below ¥8M ACV this needs VP-Sales sign-off; at ¥8M+ it sits within desk authority under the volume-discount rule.",
  "Required trades for any exception: multi-year commit + annual prepay + case-study rights.",
  "Escalate only if the account is flagged strategic; otherwise hold the line at 25%.",
].join(" ");

export const GAP_QUERY =
  "Is a promissory-note (手形) payment clause legal under the revised Subcontract Act (取適法, effective 2026-01-01)?";

const SKILLS0: Skill[] = [
  {
    id: "s1",
    name: "B2B SaaS Pricing Exception Expert",
    expert: "Salehin R.",
    bio: "Working financial analyst · ex-KPMG deal advisory · on this team today",
    verified: true,
    priceJpy: 120,
    rating: 4.9,
    calls: 1284,
    category: "Sales · Deal Desk",
    blurb:
      "Deal-desk discount judgment from a working financial analyst: approval tiers, margin-based counter ceilings, the exact trades to demand, and when to escalate versus hold the line.",
  },
  {
    id: "s2",
    name: "Refund & Credit Approval Guardrails",
    expert: "M. Tanaka",
    bio: "Ex-Zendesk JP CS lead · 4,000+ escalations resolved",
    verified: true,
    priceJpy: 80,
    rating: 4.7,
    calls: 892,
    category: "Customer Success",
    blurb: "When to refund, when to credit, when to escalate — with limits.",
  },
  {
    id: "s3",
    name: "JP Market-Entry Price Localization",
    expert: "A. Fujimori",
    bio: "Ex-Rakuten pricing PM · 12 yrs Japan go-to-market",
    verified: true,
    priceJpy: 150,
    rating: 4.8,
    calls: 457,
    category: "Pricing · Japan",
    blurb: "Yen price laddering, tax display rules, channel margin norms.",
  },
  {
    id: "s4",
    name: "Enterprise Security Questionnaire Triage",
    expert: "D. Okafor",
    bio: "GRC lead, ex-Stripe · SOC2 & ISO27001 · 300+ questionnaires",
    verified: true,
    priceJpy: 90,
    rating: 4.6,
    calls: 2031,
    category: "Compliance",
    blurb: "Answer 80% instantly, flag the 20% that needs legal.",
  },
  {
    id: "s5",
    name: "HR Offer Negotiation Bands (JP)",
    expert: "Y. Park",
    bio: "Ex-Mercari HRBP · 500+ tech offers closed",
    verified: true,
    priceJpy: 110,
    rating: 4.8,
    calls: 316,
    category: "People",
    blurb: "Comp bands, sign-on limits, counter-offer playbook.",
  },
  {
    id: "s6",
    name: "Cross-border Invoice & インボイス Edge Cases",
    expert: "R. Ito",
    bio: "税理士 (JP tax accountant) · cross-border SaaS specialist",
    verified: true,
    priceJpy: 100,
    rating: 4.7,
    calls: 748,
    category: "Finance Ops",
    blurb: "Qualified-invoice traps for non-JP counterparties.",
  },
  {
    id: "s8",
    name: "Legacy Java Migration Triage",
    expert: "Chen Wei",
    bio: "Ex-Alibaba P7 · 10 yrs full-stack · JSConf guest speaker",
    verified: true,
    priceJpy: 130,
    rating: 4.8,
    calls: 1102,
    category: "Engineering",
    blurb:
      "What to strangle, what to rewrite, what to leave alone — Spring→K8s at bank scale.",
  },
  {
    id: "s9",
    name: "Prod Incident War-Room Commander",
    expert: "S. Nakamura",
    bio: "Ex-LINE SRE lead · 200+ Sev-1 incidents · SRECon speaker",
    verified: true,
    priceJpy: 180,
    rating: 4.9,
    calls: 673,
    category: "Engineering · SRE",
    blurb:
      "First 15 minutes of a Sev-1: what to check, who to page, when to roll back.",
  },
  {
    id: "s10",
    name: "AWS Cost Anomaly Judgment",
    expert: "P. Sharma",
    bio: "Ex-AWS TAM · $40M+ cumulative client savings",
    verified: true,
    priceJpy: 90,
    rating: 4.7,
    calls: 1540,
    category: "FinOps",
    blurb: "Spike triage: real growth, misconfig, or abuse — and the safe kill-switch order.",
  },
  {
    id: "s11",
    name: "Cold Outreach Reply Doctor",
    expert: "L. Müller",
    bio: "20% reply rate across 50k B2B emails · ex-Salesloft",
    verified: true,
    priceJpy: 70,
    rating: 4.5,
    calls: 2214,
    category: "Sales",
    blurb: "Line-by-line surgery on the email that isn't getting answered.",
  },
  {
    id: "s12",
    name: "Short-Video Hook Surgery",
    expert: "Aoi K.",
    bio: "3 accounts past 1M followers · ex-ByteDance creator ops",
    verified: true,
    priceJpy: 85,
    rating: 4.6,
    calls: 1877,
    category: "Marketing",
    blurb: "First-2-seconds retention: what to cut, what to front-load, per platform.",
  },
  {
    id: "s13",
    name: "SaaS Churn Save Calls",
    expert: "J. Rivera",
    bio: "Ex-HubSpot retention lead · 38% save rate",
    verified: true,
    priceJpy: 110,
    rating: 4.7,
    calls: 529,
    category: "Customer Success",
    blurb: "The save-offer ladder, and the churn reasons you should let walk.",
  },
  {
    id: "s14",
    name: "Term Sheet Red Flags",
    expert: "E. Goldberg",
    bio: "Ex-Cooley associate · 300+ venture financings",
    verified: true,
    priceJpy: 200,
    rating: 4.9,
    calls: 388,
    category: "Legal · Fundraising",
    blurb: "Participating preferred, tripwire covenants, board-control math — flagged in seconds.",
  },
  {
    id: "s15",
    name: "Semiconductor Vendor Qualification",
    expert: "H. Yamamoto",
    bio: "30 yrs at Kyocera · retired process engineer, earning in retirement",
    verified: true,
    priceJpy: 160,
    rating: 5.0,
    calls: 241,
    category: "Manufacturing",
    blurb:
      "Supplier audit judgment no datasheet carries: what a clean fab smells like.",
  },
  {
    id: "s16",
    name: "Restaurant Menu Engineering (JP)",
    expert: "T. Ogawa",
    bio: "3 Michelin-listed openings · Osaka native",
    verified: true,
    priceJpy: 60,
    rating: 4.6,
    calls: 962,
    category: "Hospitality",
    blurb: "Price anchors, star-dog matrix, seasonal rotation for JP diners.",
  },
  {
    id: "s17",
    name: "Crypto Listing Compliance (JP)",
    expert: "M. Suzuki",
    bio: "Ex-bitFlyer listing committee · JVCEA rulebook",
    verified: true,
    priceJpy: 150,
    rating: 4.8,
    calls: 414,
    category: "Web3 · Japan",
    blurb: "What the self-regulator actually rejects, and how to pre-empt it.",
  },
  {
    id: "s18",
    name: "Game Economy Balancing",
    expert: "F. Dubois",
    bio: "Ex-Ubisoft economist · 5 live-ops titles",
    verified: true,
    priceJpy: 120,
    rating: 4.7,
    calls: 806,
    category: "Gaming",
    blurb: "Sink/faucet audits before your currency inflates into meaninglessness.",
  },
  {
    id: "s19",
    name: "ESL Pitch Coaching for Founders",
    expert: "N. Okonkwo",
    bio: "Pitch coach to 40+ accelerator-batch founders",
    verified: true,
    priceJpy: 75,
    rating: 4.8,
    calls: 1093,
    category: "Communications",
    blurb: "Your 2-minute pitch, rewritten for rhythm a jury remembers.",
  },
];

const MINTED_SKILL: Skill = {
  id: "s7",
  name: "取適法 Payment-Terms Compliance",
  expert: "K. Watanabe",
  bio: "JP commercial compliance consultant · 18 yrs · 下請法/取適法",
  verified: true,
  priceJpy: 140,
  rating: 5.0,
  calls: 1,
  category: "Compliance · Japan",
  blurb:
    "Promissory-note ban, unilateral price-cut rules and transfer-fee liability under the 2026 Toritekihō.",
  minted: "Minted from completed human task #217",
  isNew: true,
};

const AGENTS = [
  "nego-agent-7f2e",
  "procure-bot-a11c",
  "cs-agent-30d9",
  "revops-agent-b442",
  "sec-review-agent-9e07",
];

const START_BALANCE = 84_360;

/* ─────────────────────────── helpers ─────────────────────────── */

export const yen = (n: number) => "¥" + n.toLocaleString("ja-JP");
const rid = () => Math.random().toString(36).slice(2, 10);
const txh = () =>
  "0x" +
  Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("") +
  "…" +
  Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");

const SPLIT = 0.85;

function initial(): DemoState {
  return {
    skills: SKILLS0,
    audit: [
      // deterministic seed rows — no rid()/txh() here, or SSR and client
      // hydrate with different random values and React flags a mismatch
      {
        id: "seed-1",
        ts: Date.now() - 1000 * 60 * 4,
        kind: "invoke",
        agent: "revops-agent-b442",
        skillName: "B2B SaaS Pricing Exception Expert",
        gross: 120,
        net: 102,
        tx: "0x8a4f21c9…e3d0",
      },
      {
        id: "seed-2",
        ts: Date.now() - 1000 * 60 * 9,
        kind: "invoke",
        agent: "sec-review-agent-9e07",
        skillName: "Enterprise Security Questionnaire Triage",
        gross: 90,
        net: 77,
        tx: "0x30bd77a1…9c42",
      },
    ],
    toasts: [],
    balance: START_BALANCE,
    lifetime: 412_180,
    invoking: false,
    answerShown: false,
    humanTask: "hidden",
    ambient: true,
    seen: [],
    resets: 0,
  };
}

/* network-wide payout figure derived from live call counts — distinct from
   any single seller's wallet lifetime (they were being conflated in copy) */
export const networkPaidJpy = (skills: Skill[]) =>
  Math.round(skills.reduce((a, s) => a + s.calls * s.priceJpy, 0) * SPLIT);

/* ─────────────────────────── reducer ─────────────────────────── */

function apply(s: DemoState, ev: Ev): DemoState {
  if (s.seen.includes(ev.id)) return s;
  const seen = [...s.seen.slice(-200), ev.id];

  switch (ev.t) {
    case "invoke_hero_start":
      return { ...s, seen, invoking: true, answerShown: false };

    case "invoke_hero_settle": {
      // guard: ignore settles with no live invoke — kills the stale
      // setTimeout after R and double-click double-settles
      if (!s.invoking) return { ...s, seen };
      // find by id, NOT index 0 — mint prepends s7 and would hijack the hero
      const hero = s.skills.find((k) => k.id === "s1");
      if (!hero) return { ...s, seen };
      const net = Math.round(hero.priceJpy * SPLIT);
      const row: AuditRow = {
        id: ev.id + "r",
        ts: Date.now(),
        kind: "invoke",
        agent: "nego-agent-7f2e",
        skillName: hero.name,
        gross: hero.priceJpy,
        net,
        tx: txh(),
      };
      return {
        ...s,
        seen,
        invoking: false,
        answerShown: true,
        skills: s.skills.map((k) =>
          k.id === "s1" ? { ...k, calls: k.calls + 1 } : k,
        ),
        balance: s.balance + net,
        lifetime: s.lifetime + net,
        audit: [row, ...s.audit].slice(0, 40),
        toasts: [
          {
            id: ev.id + "t",
            kind: "pay",
            title: `skill_invoke · ${row.agent}`,
            body: `paid ${yen(hero.priceJpy)} → expert +${yen(net)} · platform ${yen(hero.priceJpy - net)}`,
          },
          ...s.toasts,
        ].slice(0, 4),
      };
    }

    case "ambient": {
      const sk = s.skills.find((k) => k.id === ev.skillId);
      if (!sk) return { ...s, seen };
      const net = Math.round(sk.priceJpy * SPLIT);
      const mine = sk.expert === "Salehin R.";
      const row: AuditRow = {
        id: ev.id + "r",
        ts: Date.now(),
        kind: "invoke",
        agent: ev.agent,
        skillName: sk.name,
        gross: sk.priceJpy,
        net,
        tx: txh(),
      };
      return {
        ...s,
        seen,
        skills: s.skills.map((k) =>
          k.id === sk.id ? { ...k, calls: k.calls + 1 } : k,
        ),
        balance: mine ? s.balance + net : s.balance,
        lifetime: mine ? s.lifetime + net : s.lifetime,
        audit: [row, ...s.audit].slice(0, 40),
      };
    }

    case "hire_advance": {
      const order: HumanTaskStatus[] = [
        "hidden",
        "gap",
        "matched",
        "offer_sent",
        "accepted",
        "delivered",
      ];
      const next = order[Math.min(order.indexOf(s.humanTask) + 1, order.length - 1)];
      const toast: Toast | null =
        next === "offer_sent"
          ? {
              id: ev.id + "t",
              kind: "mail",
              title: "task_offer · email sent",
              body: "K. Watanabe (opt-in expert) · scope + deadline 16:00 + ¥15,000",
            }
          : null;
      return {
        ...s,
        seen,
        humanTask: next,
        toasts: toast ? [toast, ...s.toasts].slice(0, 4) : s.toasts,
      };
    }

    case "mint": {
      if (s.skills.some((k) => k.id === MINTED_SKILL.id)) return { ...s, seen };
      const row: AuditRow = {
        id: ev.id + "r",
        ts: Date.now(),
        kind: "mint",
        agent: "expertos-compiler",
        skillName: MINTED_SKILL.name,
        gross: 0,
        net: 0,
        tx: txh(),
        note: "task #217 → encrypted skill · expert approved",
      };
      return {
        ...s,
        seen,
        // a stray 3 without the hire flow must not conjure a completed pipeline
        humanTask: s.humanTask === "hidden" ? "hidden" : "delivered",
        skills: [MINTED_SKILL, ...s.skills],
        audit: [row, ...s.audit].slice(0, 40),
        toasts: [
          {
            id: ev.id + "t",
            kind: "mint",
            title: "skill_minted · 取適法 Payment-Terms Compliance",
            body: "Completed human task is now a reusable encrypted skill (¥140/call)",
          },
          ...s.toasts,
        ].slice(0, 4),
      };
    }

    case "toggle_ambient":
      return { ...s, seen, ambient: !s.ambient };

    case "dismiss_toast":
      return { ...s, seen, toasts: s.toasts.filter((t) => t.id !== ev.toastId) };

    case "reset":
      return { ...initial(), seen, resets: (s.resets ?? 0) + 1 };

    case "hydrate":
      // restore a persisted snapshot; keep dedupe history from both sides
      return {
        ...ev.snap,
        toasts: [],
        invoking: false,
        resets: ev.snap.resets ?? 0,
        seen: [...new Set([...ev.snap.seen, ...seen])].slice(-200),
      };

    default:
      return s;
  }
}

/* ─────────────────────────── provider ─────────────────────────── */

// Omit on a discriminated union collapses it to common fields — distribute it
type DistOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
type EvIn = DistOmit<Ev, "id"> & { id?: string };

const Ctx = createContext<{
  state: DemoState;
  send: (ev: EvIn) => void;
} | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(apply, undefined, initial);
  const bc = useRef<BroadcastChannel | null>(null);

  const send = useMemo(
    () =>
      (ev: EvIn) => {
        const full = { ...ev, id: ev.id ?? rid() } as Ev;
        dispatch(full);
        bc.current?.postMessage(full);
      },
    [],
  );

  // cross-tab sync
  useEffect(() => {
    const ch = new BroadcastChannel("expertos-demo");
    bc.current = ch;
    ch.onmessage = (m) => dispatch(m.data as Ev);
    return () => ch.close();
  }, []);

  // survive reloads / late-opened tabs: hydrate once, then persist on change.
  // `ready` is state (not a ref) so the persist effect only fires on a commit
  // that already contains the hydrated snapshot — a ref flips too early and
  // clobbers the snapshot with the initial state under StrictMode.
  const [ready, setReady] = React.useState(false);
  useEffect(() => {
    try {
      // v3: catalog expanded to 19 skills + bios — older snapshots would
      // resurrect the 6-skill store, so they're orphaned by the key bump
      const raw = localStorage.getItem("expertos-demo-state-v3");
      if (raw) dispatch({ id: rid(), t: "hydrate", snap: JSON.parse(raw) });
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("expertos-demo-state-v3", JSON.stringify(state));
    } catch {}
  }, [ready, state]);

  // keyboard driver: 1 invoke · 2 hire flow · 3 mint · P ambient · R reset
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "1") {
        send({ t: "invoke_hero_start" });
        setTimeout(() => send({ t: "invoke_hero_settle" }), 1600);
      } else if (e.key === "2") send({ t: "hire_advance" });
      else if (e.key === "3") send({ t: "mint" });
      else if (e.key === "p" || e.key === "P") send({ t: "toggle_ambient" });
      else if (e.key === "r" || e.key === "R") send({ t: "reset" });
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [send]);

  // ambient market activity (visible tab only)
  useEffect(() => {
    if (!state.ambient) return;
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const pool = ["s2", "s3", "s4", "s6", "s9", "s10", "s11", "s12", "s13", "s16", "s18", "s19"];
      send({
        t: "ambient",
        skillId: pool[Math.floor(Math.random() * pool.length)],
        agent: AGENTS[Math.floor(Math.random() * AGENTS.length)],
      });
    }, 8000);
    return () => clearInterval(t);
  }, [state.ambient, send]);

  // toast auto-dismiss
  useEffect(() => {
    if (!state.toasts.length) return;
    const t = setTimeout(
      () => send({ t: "dismiss_toast", toastId: state.toasts[state.toasts.length - 1].id }),
      5000,
    );
    return () => clearTimeout(t);
  }, [state.toasts, send]);

  return <Ctx.Provider value={{ state, send }}>{children}</Ctx.Provider>;
}

export function useDemo() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemo outside DemoProvider");
  return v;
}

/* count-up display hook for the wallet number */
export function useCountUp(target: number, ms = 900) {
  const [shown, setShown] = React.useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    if (from === target) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return shown;
}
