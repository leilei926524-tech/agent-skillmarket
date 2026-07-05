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
  verified: boolean;
  priceJpy: number;
  rating: number;
  calls: number;
  category: string;
  blurb: string;
  minted?: string; // set when converted from a human task
  isNew?: boolean;
};

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
  "Do not auto-approve 35%.",
  "Counter at 25% max, contingent on a 24-month prepaid term.",
  "Below ¥8M ACV → VP-Sales sign-off required; at ¥8M+ this sits within desk authority under the volume-discount policy.",
  "Trade requirements: multi-year + annual prepay + case-study rights.",
].join(" ");

export const GAP_QUERY =
  "Is a promissory-note (手形) payment clause legal under the revised Subcontract Act (取適法, effective 2026-01-01)?";

const SKILLS0: Skill[] = [
  {
    id: "s1",
    name: "B2B SaaS Pricing Exception Expert",
    expert: "Salehin R.",
    verified: true,
    priceJpy: 120,
    rating: 4.9,
    calls: 1284,
    category: "Sales · Deal Desk",
    blurb:
      "Discount-exception guardrails from a working financial analyst: approval tiers, trade conditions, escalation thresholds.",
  },
  {
    id: "s2",
    name: "Refund & Credit Approval Guardrails",
    expert: "M. Tanaka",
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
    verified: true,
    priceJpy: 100,
    rating: 4.7,
    calls: 748,
    category: "Finance Ops",
    blurb: "Qualified-invoice traps for non-JP counterparties.",
  },
];

const MINTED_SKILL: Skill = {
  id: "s7",
  name: "取適法 Payment-Terms Compliance",
  expert: "K. Watanabe",
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
  };
}

/* ─────────────────────────── reducer ─────────────────────────── */

function apply(s: DemoState, ev: Ev): DemoState {
  if (s.seen.includes(ev.id)) return s;
  const seen = [...s.seen.slice(-200), ev.id];

  switch (ev.t) {
    case "invoke_hero_start":
      return { ...s, seen, invoking: true, answerShown: false };

    case "invoke_hero_settle": {
      const hero = s.skills[0];
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
        skills: s.skills.map((k, i) =>
          i === 0 ? { ...k, calls: k.calls + 1 } : k,
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
        humanTask: "delivered",
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
      return { ...initial(), seen };

    case "hydrate":
      // restore a persisted snapshot; keep dedupe history from both sides
      return {
        ...ev.snap,
        toasts: [],
        invoking: false,
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
      const raw = localStorage.getItem("expertos-demo-state");
      if (raw) dispatch({ id: rid(), t: "hydrate", snap: JSON.parse(raw) });
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("expertos-demo-state", JSON.stringify(state));
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
      const pool = ["s2", "s4", "s6", "s3"];
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
