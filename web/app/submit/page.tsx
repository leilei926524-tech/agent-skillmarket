"use client";

import { FormEvent, useMemo, useState } from "react";
import { api } from "@/lib/live";

const TEMPLATE = `---
name: your-skill-name
description: "Describe when an agent should use this skill and what outcome it produces."
license: MIT
metadata:
  author: your-name-or-org
  version: "1.0.0"
---

# Your Skill Name

## Prerequisites

List required tools, accounts, or permissions.

## Routing

Explain what this skill does, what it does not do, and when to use a fallback.

## Workflow

1. Start with read-only checks.
2. Validate inputs and assumptions.
3. Require confirmation before consequential writes.
4. Return evidence and limits.
`;

type Receipt = { submission: { id: string; slug: string; status: string; scan: { riskLevel: string; warnings: string[]; checks: unknown[] } }; statusToken: string; message: string };

export default function SubmitSkill() {
  const [form, setForm] = useState({ title: "", description: "", publisherName: "", publisherEmail: "", githubUrl: "", categories: "", usageExamples: "", skillMarkdown: TEMPLATE, rightsConfirmed: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<unknown>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const parsed = useMemo(() => {
    const name = form.skillMarkdown.match(/^name:\s*([^\n]+)/m)?.[1]?.trim() || "not detected";
    const version = form.skillMarkdown.match(/^\s*version:\s*["']?([^"'\n]+)/m)?.[1]?.trim() || "not detected";
    return { name, version, bytes: new TextEncoder().encode(form.skillMarkdown).byteLength, lines: form.skillMarkdown.split("\n").length };
  }, [form.skillMarkdown]);
  const set = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  async function onFile(file?: File) {
    if (!file) return;
    if (!/\.(?:md|markdown)$/i.test(file.name)) { setError("Beta upload accepts .md or .markdown. Paste a SKILL.md below if your source is a ZIP."); return; }
    set("skillMarkdown", await file.text());
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setDetails(null); setReceipt(null);
    try {
      const result = await api<Receipt>("/api/v1/submissions", { method: "POST", body: JSON.stringify({ ...form, categories: form.categories.split(",").map((v) => v.trim()).filter(Boolean), usageExamples: form.usageExamples.split("\n").map((v) => v.trim()).filter(Boolean) }) });
      setReceipt(result);
      sessionStorage.setItem(`expertos-submission-${result.submission.id}`, result.statusToken);
    } catch (err) {
      const typed = err as Error & { data?: unknown }; setError(typed.message); setDetails(typed.data || null);
    } finally { setBusy(false); }
  }
  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-12 w-full">
      <section className="pt-10 pb-8"><div className="kicker mb-3">OKX-inspired publish flow · ExpertOS beta</div><h1 className="display-hero text-4xl md:text-6xl">Submit a skill.<br />Prove what it does.</h1><p className="mt-5 max-w-3xl text-base leading-relaxed">Upload or paste a standard SKILL.md. The server performs manifest, size, prompt-injection, credential, and destructive-command checks before creating a durable review record.</p></section>
      {receipt ? (
        <div className="panel p-6 md:p-8 !border-green/50"><div className="kicker !text-[9px] text-green mb-3">SUBMISSION STORED</div><h2 className="text-3xl font-bold">Pre-scan passed.</h2><p className="mt-3">Status: <span className="chip bg-amber/10 text-amber border border-amber/30">{receipt.submission.status}</span></p><dl className="grid grid-cols-[110px_1fr] gap-y-3 mt-6 text-sm"><dt className="text-dim">Submission</dt><dd className="mono break-all">{receipt.submission.id}</dd><dt className="text-dim">Skill slug</dt><dd className="mono">{receipt.submission.slug}</dd><dt className="text-dim">Risk result</dt><dd>{receipt.submission.scan.riskLevel}</dd><dt className="text-dim">Warnings</dt><dd>{receipt.submission.scan.warnings.length ? receipt.submission.scan.warnings.join(" · ") : "None from the heuristic pre-scan"}</dd></dl><p className="text-xs text-dim mt-6">Your private status token is saved only in this browser session. “Passed” is not an endorsement; manual review is still required.</p><button type="button" className="btn-outline mt-5" onClick={() => setReceipt(null)}>SUBMIT ANOTHER VERSION</button></div>
      ) : (
        <form onSubmit={submit} className="grid lg:grid-cols-[1fr_1.35fr] gap-4">
          <div className="space-y-4">
            <div className="panel p-5 space-y-4"><div className="kicker !text-[9px]">01 · LISTING</div><label className="label">Skill name<input className="field" value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={100} placeholder="Deal Desk Discount Guardrails" /></label><label className="label">Description<textarea className="field min-h-28" value={form.description} onChange={(e) => set("description", e.target.value)} required minLength={40} maxLength={1024} placeholder="When an agent should use this skill, what it returns, and its limits." /></label><label className="label">Categories · up to 3<input className="field" value={form.categories} onChange={(e) => set("categories", e.target.value)} placeholder="Sales operations, Pricing" /></label><label className="label">Usage examples · one per line<textarea className="field min-h-24" value={form.usageExamples} onChange={(e) => set("usageExamples", e.target.value)} placeholder="Evaluate a 25% discount request…" /></label></div>
            <div className="panel p-5 space-y-4"><div className="kicker !text-[9px]">02 · PUBLISHER</div><label className="label">Publisher name<input className="field" value={form.publisherName} onChange={(e) => set("publisherName", e.target.value)} required /></label><label className="label">Contact email<input className="field" type="email" value={form.publisherEmail} onChange={(e) => set("publisherEmail", e.target.value)} required /></label><label className="label">Public GitHub URL · optional<input className="field" type="url" value={form.githubUrl} onChange={(e) => set("githubUrl", e.target.value)} placeholder="https://github.com/org/repo" /></label></div>
          </div>
          <div className="panel p-5 md:p-6"><div className="flex flex-wrap justify-between gap-3"><div className="kicker !text-[9px]">03 · SKILL PACKAGE</div><div className="meta text-[9px] text-dim">{parsed.name} · v{parsed.version}<br />{parsed.bytes.toLocaleString()} BYTES · {parsed.lines} LINES</div></div><label className="label mt-5">Upload SKILL.md<input className="field" type="file" accept=".md,.markdown,text/markdown" onChange={(e) => onFile(e.target.files?.[0])} /></label><label className="label mt-4">SKILL.md content<textarea className="code-input" spellCheck={false} value={form.skillMarkdown} onChange={(e) => set("skillMarkdown", e.target.value)} required /></label><label className="flex items-start gap-3 mt-5 text-sm leading-relaxed"><input type="checkbox" className="mt-1" checked={form.rightsConfirmed} onChange={(e) => set("rightsConfirmed", e.target.checked)} required /><span>I have the right to publish this content under MIT and it contains no credentials, private data, or undisclosed third-party confidential material.</span></label>{error && <div className="error-box mt-5"><b>Pre-scan blocked this submission.</b><br />{error}{details ? <pre className="code-block mt-3 max-h-56 overflow-auto">{JSON.stringify(details, null, 2)}</pre> : null}</div>}<button className="btn-ink mt-6" disabled={busy}>{busy ? "RUNNING PRE-SCAN…" : "SUBMIT FOR REVIEW →"}</button><p className="text-xs text-dim mt-4">Beta supports a single Markdown file. ZIP/folder assets and platform signatures are the next packaging milestone.</p></div>
        </form>
      )}
    </main>
  );
}
