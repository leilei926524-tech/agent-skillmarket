"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/live";
import { LOCALES, useI18n } from "@/lib/i18n";

type SubmissionRecord = {
  id: string;
  slug: string;
  title?: string;
  status: string;
  riskLevel?: string;
  scan: { riskLevel: string; warnings: string[]; checks: unknown[]; reviewReason?: string };
  createdAt?: string;
  updatedAt?: string;
};
type Receipt = { submission: SubmissionRecord; statusToken?: string; message?: string; recovered?: boolean };
type ApiErrorBody = { error?: { code?: string; message?: string; details?: { warnings?: string[] } } };

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

function scanWarningText(warning: string, isZh: boolean) {
  if (!isZh) return warning;
  if (warning.includes("name must be a kebab-case")) return "把 SKILL.md 顶部的 name 改成小写英文和短横线，例如 fresh-user-research-notes。";
  if (warning.includes("description must contain")) return "把 description 补充到 40–1024 个字符，并说明何时使用、何时不使用以及会得到什么。";
  if (warning.includes("version must look like")) return "把 version 改成类似 1.0.0 的版本号。";
  if (warning.includes("license must be MIT")) return "把 license 改成 MIT；当前测试版暂只接受 MIT。";
  if (warning.includes("must start with YAML frontmatter")) return "文件第一行必须是 ---，并在顶部填写 name、description、license 和 metadata。";
  if (warning.includes("frontmatter is not closed")) return "在顶部 YAML 信息结束后补一行 ---。";
  if (warning.includes("must be under 200 KB")) return "把文件缩短到 200 KB、800 行以内。";
  if (warning.includes("file is empty")) return "上传或粘贴一份完整的 SKILL.md。";
  if (warning.includes("Instruction override")) return "删除要求忽略系统或既有指令的内容。";
  if (warning.includes("Secret exfiltration")) return "删除发送、上传或套取密钥与凭证的内容。";
  if (warning.includes("Remote shell")) return "删除下载后直接交给 shell 执行的命令。";
  if (warning.includes("Destructive filesystem")) return "删除会递归清空系统或用户目录的命令。";
  if (warning.includes("Embedded credential")) return "删除文件中疑似真实的私钥或 API 凭证。";
  if (warning.includes("elevated or broad filesystem")) return "这份 Skill 申请了过高的系统或文件权限，请缩小权限范围。";
  if (warning.includes("high-risk wallet secrets")) return "内容提到了钱包私密凭证，需要人工确认它不会读取或泄露密钥。";
  if (warning.includes("external write or financial action")) return "内容可能执行外部写入或付款操作，请明确要求先由用户确认。";
  if (warning.includes("shell commands")) return "内容包含 shell 命令，审核时需要逐条核对真实程序和参数。";
  return "请根据预检查提示修改 SKILL.md 后再试。";
}

function submissionError(caught: Error & { data?: unknown }, isZh: boolean) {
  const body = (caught.data && typeof caught.data === "object" ? caught.data : {}) as ApiErrorBody;
  const code = body.error?.code || "";
  if (code === "prescan_failed") {
    const warnings = body.error?.details?.warnings || [];
    return {
      message: isZh ? "SKILL.md 还需要修改，完成下面项目后再提交：" : "Update the SKILL.md, then submit it again:",
      actions: warnings.length ? warnings.map((warning) => scanWarningText(warning, isZh)) : [isZh ? "检查顶部格式和安全边界后再试。" : "Check the frontmatter format and safety boundaries."],
    };
  }
  const zhMessages: Record<string, string> = {
    invalid_listing: "请填写名称，并把描述写到 40–1024 个字符。",
    invalid_publisher: "请填写发布者名称和有效的联系邮箱。",
    rights_not_confirmed: "请确认你有权以 MIT 许可证发布这份内容。",
    invalid_github_url: "GitHub 地址必须以 https://github.com/ 开头。",
    submission_limit: "这个邮箱今天已提交 10 次，请明天再试。",
  };
  return {
    message: isZh ? (zhMessages[code] || "这次没有提交成功，请检查内容后再试。") : (body.error?.message || caught.message || "The submission could not be completed."),
    actions: [] as string[],
  };
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

async function copyText(value: string) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }
}

function aiPrompt(locale: string, language: string) {
  if (locale === "zh-CN") return `任务：帮我创建一份可提交到 ExpertOS 的 Agent 技能文件（SKILL.md）。

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

  return `Task: Help me create an agent skill file (SKILL.md) for submission to ExpertOS.

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
  const [selectedFileName, setSelectedFileName] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errorActions, setErrorActions] = useState<string[]>([]);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [recoveryUrl, setRecoveryUrl] = useState("");
  const [recoveryCopied, setRecoveryCopied] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState<"" | "incomplete" | "not_found">("");
  const language = LOCALES.find((option) => option.code === locale)?.nativeName || "English";
  const prompt = useMemo(() => aiPrompt(locale, language), [locale, language]);
  const recoveryErrorMessage = recoveryError === "incomplete"
    ? (locale === "zh-CN" ? "这条恢复链接不完整，请使用提交成功后保存的完整私密链接。" : "This recovery link is incomplete. Use the complete private link saved after submission.")
    : recoveryError === "not_found"
      ? (locale === "zh-CN" ? "无法恢复这条提交记录。链接可能不完整、已损坏，或凭证不匹配。" : "This submission could not be recovered. The link may be incomplete, damaged, or use the wrong token.")
      : "";
  const hasSkill = Boolean(form.skillMarkdown.trim());
  const submissionStatus = receipt?.submission.status === "reviewing"
    ? (locale === "zh-CN" ? "等待人工审核" : "Awaiting manual review")
    : receipt?.submission.status;
  const receiptRisk = receipt?.submission.scan.riskLevel || receipt?.submission.riskLevel;
  const riskLabel = receiptRisk === "normal"
    ? t("common.risk.normal")
    : receiptRisk === "high"
      ? t("common.risk.high")
      : receiptRisk === "caution"
        ? t("common.risk.caution")
        : receiptRisk;
  const parsed = useMemo(() => {
    const name = cleanYamlValue(form.skillMarkdown.match(/^name:\s*(.+)$/m)?.[1]) || t("submit.notDetected");
    const version = cleanYamlValue(form.skillMarkdown.match(/^\s*version:\s*(.+)$/m)?.[1]) || t("submit.notDetected");
    return { name, version, bytes: new TextEncoder().encode(form.skillMarkdown).byteLength, lines: form.skillMarkdown ? form.skillMarkdown.split("\n").length : 0 };
  }, [form.skillMarkdown, t]);

  const set = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const submissionId = params.get("submission") || "";
    const token = params.get("token") || "";
    if (!submissionId && !token) return;
    if (!submissionId || !token) {
      setRecoveryError("incomplete");
      return;
    }
    setRecovering(true);
    setRecoveryError("");
    api<{ submission: SubmissionRecord }>(`/api/v1/submissions/${encodeURIComponent(submissionId)}/status`, {
      headers: { "X-Submission-Token": token },
    })
      .then((result) => {
        setReceipt({ submission: result.submission, recovered: true });
        setRecoveryUrl(window.location.href);
      })
      .catch(() => setRecoveryError("not_found"))
      .finally(() => setRecovering(false));
  }, []);

  function setSkillMarkdown(skillMarkdown: string) {
    const inferred = inferListing(skillMarkdown);
    setError("");
    setErrorActions([]);
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
    if (!await copyText(prompt)) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  async function copyRecoveryLink() {
    if (!recoveryUrl || !await copyText(recoveryUrl)) return;
    setRecoveryCopied(true);
    window.setTimeout(() => setRecoveryCopied(false), 2500);
  }

  function clearReceipt() {
    setReceipt(null);
    setRecoveryUrl("");
    setRecoveryError("");
    setSelectedFileName("");
    setForm(emptyForm);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }

  async function onFile(file?: File) {
    if (!file) return;
    setSelectedFileName(file.name);
    setError("");
    setErrorActions([]);
    if (!/\.(?:md|markdown)$/i.test(file.name)) { setError(t("submit.fileError")); return; }
    setSkillMarkdown(await file.text());
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setErrorActions([]); setReceipt(null);
    try {
      const result = await api<Receipt>("/api/v1/submissions", { method: "POST", body: JSON.stringify({ ...form, categories: form.categories.split(",").map((value) => value.trim()).filter(Boolean), usageExamples: form.usageExamples.split("\n").map((value) => value.trim()).filter(Boolean) }) });
      setReceipt(result);
      if (result.statusToken) {
        sessionStorage.setItem(`gokui-submission-${result.submission.id}`, result.statusToken);
        const fragment = new URLSearchParams({ submission: result.submission.id, token: result.statusToken });
        const next = `${window.location.pathname}${window.location.search}#${fragment.toString()}`;
        window.history.replaceState(null, "", next);
        setRecoveryUrl(window.location.href);
      }
    } catch (caught) {
      const friendly = submissionError(caught as Error & { data?: unknown }, locale === "zh-CN");
      setError(friendly.message);
      setErrorActions(friendly.actions);
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-12 w-full">
      <section className="pt-10 pb-8">
        <div className="kicker mb-3">{t("submit.kicker")}</div>
        <h1 className="display-hero text-4xl md:text-6xl">{t("submit.hero1")}<br />{t("submit.hero2")}</h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed">{t("submit.intro")}</p>
      </section>

      {recovering && <div className="panel p-5 mb-4 mono text-sm" role="status">{locale === "zh-CN" ? "正在恢复提交记录…" : "Recovering submission…"}</div>}
      {recoveryErrorMessage && <div className="error-box mb-4" role="alert">{recoveryErrorMessage}</div>}

      {receipt ? (
        <div className="panel p-6 md:p-8 !border-green/50" role="status">
          <div className="kicker !text-[9px] text-green mb-3">{receipt.recovered ? (locale === "zh-CN" ? "已找到私密记录" : "Private record found") : t("submit.stored")}</div>
          <h2 className="text-3xl font-bold">{receipt.recovered ? (locale === "zh-CN" ? "提交记录已恢复" : "Submission recovered") : t("submit.scanPassed")}</h2>
          <p className="mt-3">{t("common.status")}: <span className="chip bg-amber/10 text-amber border border-amber/30">{submissionStatus}</span></p>
          <dl className="grid grid-cols-1 sm:grid-cols-[110px_1fr] gap-y-2 sm:gap-y-3 mt-6 text-sm"><dt className="text-dim">{t("submit.id")}</dt><dd className="mono break-all">{receipt.submission.id}</dd><dt className="text-dim">{t("submit.slug")}</dt><dd className="mono break-all">{receipt.submission.slug}</dd><dt className="text-dim">{t("submit.risk")}</dt><dd>{riskLabel}</dd><dt className="text-dim">{t("submit.warnings")}</dt><dd>{receipt.submission.scan.warnings.length ? receipt.submission.scan.warnings.map((warning) => scanWarningText(warning, locale === "zh-CN")).join(" · ") : t("submit.noWarnings")}</dd>{receipt.submission.scan.reviewReason && <><dt className="text-dim">{locale === "zh-CN" ? "审核说明" : "Review note"}</dt><dd>{receipt.submission.scan.reviewReason}</dd></>}{receipt.submission.updatedAt && <><dt className="text-dim">{locale === "zh-CN" ? "最后更新" : "Last updated"}</dt><dd>{new Date(receipt.submission.updatedAt).toLocaleString(locale)}</dd></>}</dl>
          {recoveryUrl && <div className="mt-6 border-t border-line pt-5"><p className="text-sm font-bold">{locale === "zh-CN" ? "保存这条私密恢复链接" : "Save this private recovery link"}</p><p className="text-xs text-dim leading-relaxed mt-2">{locale === "zh-CN" ? "以后打开它即可查看审核状态，无需登录。链接里含有私密凭证；不要公开、不要贴进群聊或工单。" : "Open it later to check review status without an account. It contains a private token; do not publish it or paste it into shared chats or tickets."}</p><button type="button" className="btn-ink mt-4" onClick={copyRecoveryLink}>{recoveryCopied ? (locale === "zh-CN" ? "已复制恢复链接" : "Recovery link copied") : (locale === "zh-CN" ? "复制私密恢复链接" : "Copy private recovery link")}</button></div>}
          <p className="text-xs text-dim mt-6">{locale === "zh-CN" ? "服务器只保存恢复凭证的哈希。ExpertOS 无法替你找回丢失的原始链接。" : "The server stores only a hash of the recovery token. ExpertOS cannot reconstruct a lost original link."}</p>
          <button type="button" className="btn-outline mt-5" onClick={clearReceipt}>{t("submit.another")}</button>
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
                <a className="btn-outline" href="https://chatgpt.com/" target="_blank" rel="noreferrer" aria-label={`${t("submit.ai.open")} (opens in a new tab)`}>{t("submit.ai.open")}</a>
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
              <div className="mt-6">
                <div className="label mb-2">{t("submit.upload")}</div>
                <div className="file-picker">
                  <input
                    id="skill-file-upload"
                    className="file-input-sr"
                    type="file"
                    accept=".md,.markdown,text/markdown"
                    aria-describedby="skill-file-status"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      void onFile(file);
                      event.currentTarget.value = "";
                    }}
                  />
                  <label className="btn-outline file-picker-action" htmlFor="skill-file-upload">{t("submit.upload")}</label>
                  <span id="skill-file-status" className="file-picker-status" aria-live="polite" aria-atomic="true">
                    {selectedFileName || ".md · .markdown"}
                  </span>
                </div>
              </div>
              <details className="mt-5 border-t border-line/70 pt-4">
                <summary className="cursor-pointer text-sm font-semibold">{t("submit.paste")}</summary>
                <textarea id="skill-markdown-paste" aria-label={t("submit.paste")} className="code-input mt-4 min-h-56" spellCheck={false} value={form.skillMarkdown} onChange={(event) => setSkillMarkdown(event.target.value)} />
              </details>
              {hasSkill && <div className="success-box mt-5" role="status"><b>{t("submit.ready")}</b><br /><span className="mono text-xs">{parsed.name} · v{parsed.version} · {parsed.lines.toLocaleString(locale)} {t("common.lines")}</span></div>}
              {error && !hasSkill && <div className="error-box mt-5" role="alert">{error}</div>}
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
                <label className="label">{t("submit.publisherName")}<input className="field" autoComplete="name" value={form.publisherName} onChange={(event) => set("publisherName", event.target.value)} required /></label>
                <label className="label md:col-span-2">{t("submit.description")}<textarea className="field min-h-24" value={form.description} onChange={(event) => set("description", event.target.value)} required minLength={40} maxLength={1024} placeholder={t("submit.descriptionPlaceholder")} /></label>
                <label className="label">{t("submit.contactEmail")}<input className="field" type="email" autoComplete="email" value={form.publisherEmail} onChange={(event) => set("publisherEmail", event.target.value)} required /></label>
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
                <textarea aria-label={t("submit.edit")} className="code-input mt-3" spellCheck={false} value={form.skillMarkdown} onChange={(event) => setSkillMarkdown(event.target.value)} required />
              </details>

              <label className="flex items-start gap-3 mt-6 text-sm leading-relaxed"><input type="checkbox" className="mt-1" checked={form.rightsConfirmed} onChange={(event) => set("rightsConfirmed", event.target.checked)} required /><span>{t("submit.rights")}</span></label>
              {error && <div className="error-box mt-5" role="alert"><b>{t("submit.blocked")}</b><br />{error}{errorActions.length ? <ul className="list-disc pl-5 mt-3 space-y-1">{errorActions.map((action) => <li key={action}>{action}</li>)}</ul> : null}</div>}
              <button className="btn-ink mt-6" disabled={busy}>{busy ? t("submit.running") : t("submit.send")}</button>
              <p className="text-xs text-dim mt-4">{t("submit.betaNote")}</p>
            </form>
          )}
        </div>
      )}
    </main>
  );
}
