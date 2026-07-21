"use client";

import { FormEvent, useMemo, useState } from "react";
import { api } from "@/lib/live";
import { LOCALES, useI18n } from "@/lib/i18n";

type Receipt = { submission: { id: string; slug: string; status: string; scan: { riskLevel: string; warnings: string[]; checks: unknown[] } }; statusToken: string; message: string };

const emptyForm = {
  title: "",
  description: "",
  publisherName: "",
  publisherEmail: "",
  githubUrl: "",
  categories: "",
  usageExamples: "",
  skillMarkdown: "",
  rightsConfirmed: false,
};

function cleanYamlValue(value = "") {
  return value.trim().replace(/^(["'])/, "").replace(/(["'])$/, "").trim();
}

function humanizeSlug(value: string) {
  return value.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function inferListing(markdown: string) {
  const name = cleanYamlValue(markdown.match(/^name:\s*(.+)$/m)?.[1]);
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const description = cleanYamlValue(markdown.match(/^description:\s*(.+)$/m)?.[1]);
  const author = cleanYamlValue(markdown.match(/^\s+author:\s*(.+)$/m)?.[1]);
  const category = cleanYamlValue(markdown.match(/^\s+category:\s*(.+)$/m)?.[1]);
  return {
    title: (heading || humanizeSlug(name)).slice(0, 100),
    description: description.slice(0, 1024),
    publisherName: author.slice(0, 100),
    categories: category,
  };
}

function aiPrompt(locale: string, language: string) {
  if (locale === "zh-CN") return `任务：帮我创建一份可提交到 GOKUI 的 Agent 技能文件（SKILL.md）。

我不了解技术格式。请一次只问我一个简单问题，把我的经验或工作流程整理成一个可复用的 Agent 技能。

请依次了解：
1. 这个技能要帮助 Agent 完成什么任务；
2. 什么时候应该使用，什么时候不应该使用；
3. 需要哪些输入、工具、账号或权限；
4. 具体工作步骤、判断规则和预期输出；
5. 常见失败情况、安全边界与人工确认点；
6. 两个真实、具体的使用示例。

当我不确定时，请先给出几个选项让我选择，不要替我编造事实。涉及付款、交易、删除、发布、发送消息或其他重要写入时，必须在技能中要求用户确认。技能中不得包含密码、私钥、API 密钥、个人隐私或第三方机密。

信息足够后，先展示草稿让我检查。只有在我确认后，才输出一个完整的 SKILL.md Markdown 代码块。文件必须使用以下 frontmatter：

---
name: 使用 kebab-case 的英文标识
description: "用 40–1024 个字符说明何时使用、何时不使用以及会产生什么结果"
license: MIT
metadata:
  author: 我的名字或组织
  version: "1.0.0"
  category: 一个简短类别
---

正文至少包含：适用范围、前置条件、工作流程、输入与输出、安全与限制、失败处理、示例。不要安装或执行这个技能，只负责和我一起完成文件。`;

  return `Task: Help me create an agent skill file (SKILL.md) for submission to GOKUI.

I do not know the technical format. Interview me with one simple question at a time, then turn my experience or workflow into a reusable agent skill. Conduct the interview and write the skill instructions in ${language}.

Learn, in order:
1. What task the skill should help an agent complete;
2. When it should and should not be used;
3. Required inputs, tools, accounts, or permissions;
4. The exact workflow, decision rules, and expected output;
5. Common failure cases, safety limits, and human confirmation points;
6. Two realistic, specific usage examples.

When I am unsure, suggest a few options and let me choose. Do not invent facts. Any payment, trade, deletion, publication, message, or other consequential write must require user confirmation. Do not include passwords, private keys, API keys, personal data, or third-party confidential information.

When you have enough information, show me a draft for review. Only after I confirm, output one complete SKILL.md in a single Markdown code block. Use this frontmatter:

---
name: an-english-kebab-case-slug
description: "40–1024 characters explaining when to use it, when not to use it, and what it returns"
license: MIT
metadata:
  author: my-name-or-organization
  version: "1.0.0"
  category: one-short-category
---

The body must include: scope, prerequisites, workflow, inputs and outputs, safety and limits, failure handling, and examples. Do not install or execute the skill; only help me finish the file.`;
}

export default function SubmitSkill() {
  const { locale, t } = useI18n();
  const [form, setForm] = useState(emptyForm);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<unknown>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const language = LOCALES.find((option) => option.code === locale)?.nativeName || "English";
  const prompt = useMemo(() => aiPrompt(locale, language), [locale, language]);
  const hasSkill = Boolean(form.skillMarkdown.trim());
  const parsed = useMemo(() => {
    const name = cleanYamlValue(form.skillMarkdown.match(/^name:\s*(.+)$/m)?.[1]) || t("submit.notDetected");
    const version = cleanYamlValue(form.skillMarkdown.match(/^\s*version:\s*(.+)$/m)?.[1]) || t("submit.notDetected");
    return { name, version, bytes: new TextEncoder().encode(form.skillMarkdown).byteLength, lines: form.skillMarkdown ? form.skillMarkdown.split("\n").length : 0 };
  }, [form.skillMarkdown, t]);

  const set = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  function setSkillMarkdown(skillMarkdown: string) {
    const inferred = inferListing(skillMarkdown);
    setForm((current) => ({
      ...current,
      skillMarkdown,
      title: current.title || inferred.title,
      description: current.description || inferred.description,
      publisherName: current.publisherName || inferred.publisherName,
      categories: current.categories || inferred.categories,
    }));
  }

  async function copyPrompt() {
    let didCopy = false;

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(prompt);
      didCopy = true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = prompt;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      didCopy = document.execCommand("copy");
      textarea.remove();
    }

    if (!didCopy) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  async function onFile(file?: File) {
    if (!file) return;
    setError("");
    if (!/\.(?:md|markdown)$/i.test(file.name)) { setError(t("submit.fileError")); return; }
    setSkillMarkdown(await file.text());
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setDetails(null); setReceipt(null);
    try {
      const result = await api<Receipt>("/api/v1/submissions", { method: "POST", body: JSON.stringify({ ...form, categories: form.categories.split(",").map((value) => value.trim()).filter(Boolean), usageExamples: form.usageExamples.split("\n").map((value) => value.trim()).filter(Boolean) }) });
      setReceipt(result);
      sessionStorage.setItem(`gokui-submission-${result.submission.id}`, result.statusToken);
    } catch (caught) {
      const typed = caught as Error & { data?: unknown }; setError(typed.message); setDetails(typed.data || null);
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-12 w-full">
      <section className="pt-10 pb-8">
        <div className="kicker mb-3">{t("submit.kicker")}</div>
        <h1 className="display-hero text-4xl md:text-6xl">{t("submit.hero1")}<br />{t("submit.hero2")}</h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed">{t("submit.intro")}</p>
      </section>

      {receipt ? (
        <div className="panel p-6 md:p-8 !border-green/50">
          <div className="kicker !text-[9px] text-green mb-3">{t("submit.stored")}</div>
          <h2 className="text-3xl font-bold">{t("submit.scanPassed")}</h2>
          <p className="mt-3">{t("common.status")}: <span className="chip bg-amber/10 text-amber border border-amber/30">{receipt.submission.status}</span></p>
          <dl className="grid grid-cols-[110px_1fr] gap-y-3 mt-6 text-sm"><dt className="text-dim">{t("submit.id")}</dt><dd className="mono break-all">{receipt.submission.id}</dd><dt className="text-dim">{t("submit.slug")}</dt><dd className="mono">{receipt.submission.slug}</dd><dt className="text-dim">{t("submit.risk")}</dt><dd>{receipt.submission.scan.riskLevel}</dd><dt className="text-dim">{t("submit.warnings")}</dt><dd>{receipt.submission.scan.warnings.length ? receipt.submission.scan.warnings.join(" · ") : t("submit.noWarnings")}</dd></dl>
          <p className="text-xs text-dim mt-6">{t("submit.tokenNote")}</p>
          <button type="button" className="btn-outline mt-5" onClick={() => { setReceipt(null); setForm(emptyForm); }}>{t("submit.another")}</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid lg:grid-cols-[1.08fr_.92fr] gap-4">
            <section className="panel p-6 md:p-8 !border-violet/50 bg-white/75">
              <div className="flex items-start gap-4">
                <span className="mono text-4xl font-bold text-violet">01</span>
                <div>
                  <div className="kicker !text-[9px]">{t("submit.ai.step")}</div>
                  <h2 className="text-2xl font-bold mt-2">{t("submit.ai.title")}</h2>
                  <p className="text-sm text-dim leading-relaxed mt-3">{t("submit.ai.body")}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-6">
                <button type="button" className="btn-ink" onClick={copyPrompt}>{copied ? t("submit.ai.copied") : t("submit.ai.copy")}</button>
                <a className="btn-outline" href="https://chatgpt.com/" target="_blank" rel="noreferrer">{t("submit.ai.open")}</a>
              </div>
              <p className="text-xs text-dim mt-4">{t("submit.ai.supported")}</p>
              <details className="mt-5 border-t border-line/70 pt-4">
                <summary className="cursor-pointer text-sm font-semibold">{t("submit.ai.preview")}</summary>
                <pre className="code-block whitespace-pre-wrap max-h-80 overflow-auto mt-4">{prompt}</pre>
              </details>
            </section>

            <section className="panel p-6 md:p-8">
              <div className="flex items-start gap-4">
                <span className="mono text-4xl font-bold text-violet">02</span>
                <div>
                  <div className="kicker !text-[9px]">{t("submit.uploadStep")}</div>
                  <h2 className="text-2xl font-bold mt-2">{t("submit.uploadTitle")}</h2>
                  <p className="text-sm text-dim leading-relaxed mt-3">{t("submit.uploadBody")}</p>
                </div>
              </div>
              <label className="label mt-6">{t("submit.upload")}<input className="field" type="file" accept=".md,.markdown,text/markdown" onChange={(event) => onFile(event.target.files?.[0])} /></label>
              <details className="mt-5 border-t border-line/70 pt-4">
                <summary className="cursor-pointer text-sm font-semibold">{t("submit.paste")}</summary>
                <textarea className="code-input mt-4 min-h-56" spellCheck={false} value={form.skillMarkdown} onChange={(event) => setSkillMarkdown(event.target.value)} />
              </details>
              {hasSkill && <div className="success-box mt-5"><b>{t("submit.ready")}</b><br /><span className="mono text-xs">{parsed.name} · v{parsed.version} · {parsed.lines.toLocaleString(locale)} {t("common.lines")}</span></div>}
              {error && !hasSkill && <div className="error-box mt-5">{error}</div>}
            </section>
          </div>

          {hasSkill && (
            <form onSubmit={submit} className="panel p-6 md:p-8">
              <div className="flex items-start gap-4">
                <span className="mono text-4xl font-bold text-violet">03</span>
                <div>
                  <div className="kicker !text-[9px]">{t("submit.reviewStep")}</div>
                  <h2 className="text-2xl font-bold mt-2">{t("submit.reviewTitle")}</h2>
                  <p className="text-sm text-dim leading-relaxed mt-3">{t("submit.reviewBody")}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-7">
                <label className="label">{t("submit.skillName")}<input className="field" value={form.title} onChange={(event) => set("title", event.target.value)} required maxLength={100} placeholder={t("submit.skillNamePlaceholder")} /></label>
                <label className="label">{t("submit.publisherName")}<input className="field" value={form.publisherName} onChange={(event) => set("publisherName", event.target.value)} required /></label>
                <label className="label md:col-span-2">{t("submit.description")}<textarea className="field min-h-24" value={form.description} onChange={(event) => set("description", event.target.value)} required minLength={40} maxLength={1024} placeholder={t("submit.descriptionPlaceholder")} /></label>
                <label className="label">{t("submit.contactEmail")}<input className="field" type="email" value={form.publisherEmail} onChange={(event) => set("publisherEmail", event.target.value)} required /></label>
              </div>

              <details className="mt-5 border-t border-line/70 pt-4">
                <summary className="cursor-pointer text-sm font-semibold">{t("submit.optional")}</summary>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <label className="label">{t("submit.categories")}<input className="field" value={form.categories} onChange={(event) => set("categories", event.target.value)} placeholder={t("submit.categoriesPlaceholder")} /></label>
                  <label className="label">{t("submit.github")}<input className="field" type="url" value={form.githubUrl} onChange={(event) => set("githubUrl", event.target.value)} placeholder="https://github.com/org/repo" /></label>
                  <label className="label md:col-span-2">{t("submit.examples")}<textarea className="field min-h-24" value={form.usageExamples} onChange={(event) => set("usageExamples", event.target.value)} placeholder={t("submit.examplesPlaceholder")} /></label>
                </div>
              </details>

              <details className="mt-5 border-t border-line/70 pt-4">
                <summary className="cursor-pointer text-sm font-semibold">{t("submit.edit")}</summary>
                <div className="flex flex-wrap justify-between gap-3 mt-4"><span className="mono text-xs">{parsed.name} · v{parsed.version}</span><span className="meta text-[9px] text-dim">{parsed.bytes.toLocaleString(locale)} {t("common.bytes")} · {parsed.lines.toLocaleString(locale)} {t("common.lines")}</span></div>
                <textarea className="code-input mt-3" spellCheck={false} value={form.skillMarkdown} onChange={(event) => setSkillMarkdown(event.target.value)} required />
              </details>

              <label className="flex items-start gap-3 mt-6 text-sm leading-relaxed"><input type="checkbox" className="mt-1" checked={form.rightsConfirmed} onChange={(event) => set("rightsConfirmed", event.target.checked)} required /><span>{t("submit.rights")}</span></label>
              {error && <div className="error-box mt-5"><b>{t("submit.blocked")}</b><br />{error}{details ? <pre className="code-block mt-3 max-h-56 overflow-auto">{JSON.stringify(details, null, 2)}</pre> : null}</div>}
              <button className="btn-ink mt-6" disabled={busy}>{busy ? t("submit.running") : t("submit.send")}</button>
              <p className="text-xs text-dim mt-4">{t("submit.betaNote")}</p>
            </form>
          )}
        </div>
      )}
    </main>
  );
}
