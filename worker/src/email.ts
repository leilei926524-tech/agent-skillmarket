import type { Env } from "./types";
import { escapeHtml } from "./utils";

type EmailTemplate = "offer" | "reminder" | "payment_sent" | "cancelled";

const DEFAULT_FROM = "GOKUI Marketplace <noreply@gokui.mesalaunch.com>";

function senderAddress(env: Env): string {
  return env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;
}

function renderOffer(taskTitle: string, description: string, budgetUsd: string | null, reviewUrl: string): string {
  const title = escapeHtml(taskTitle);
  const desc = escapeHtml(description);
  const budget = budgetUsd ? escapeHtml(budgetUsd) : null;
  const href = escapeHtml(reviewUrl);
  return `
<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 8px;font-size:20px">New task offer: ${title}</h2>
  <p style="color:#6b7d9e;font-size:13px;margin:0 0 20px">A GOKUI agent found your profile and thinks you're a great match.</p>
  <div style="background:#0d1626;border:1px solid rgba(150,185,255,0.11);border-radius:12px;padding:20px;margin-bottom:20px">
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#eff4fc">${desc}</p>
    ${budget ? `<p style="margin:0;font-family:monospace;font-size:18px;font-weight:700;color:#4d8dff">Budget: $${budget} USDC</p>` : ""}
  </div>
  <a href="${href}" style="display:inline-block;background:linear-gradient(180deg,#5b9bff,#2f6bed);color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px">
    Review &amp; accept task →
  </a>
  <p style="color:#6b7d9e;font-size:12px;margin-top:20px">
    This offer expires in 48 hours. The link opens a read-only review page; accepting requires an explicit confirmation. Reply to this email with questions.
  </p>
</div>`;
}

function renderPaymentSent(taskTitle: string, amountUsd: string, txHash: string): string {
  return `
<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 8px;font-size:20px">Payment sent: ${escapeHtml(taskTitle)}</h2>
  <p style="color:#3ddc97;font-size:14px;font-weight:600">✓ $${escapeHtml(amountUsd)} USDC has been sent to your wallet.</p>
  <p style="font-family:monospace;font-size:12px;color:#6b7d9e;word-break:break-all">TX: ${escapeHtml(txHash)}</p>
  <p style="color:#aab9d6;font-size:13px">Thank you for completing the task. Check your wallet for the transfer (may take 1–2 minutes).</p>
</div>`;
}

function renderCancelled(taskTitle: string, reason: string): string {
  return `
<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 8px;font-size:20px">Task cancelled: ${escapeHtml(taskTitle)}</h2>
  <p style="color:#aab9d6;font-size:13px">${escapeHtml(reason)}</p>
</div>`;
}

/**
 * Sends via Resend. Never throws; never returns provider response bodies.
 * `idempotencyKey` deduplicates sends on the provider side (safe retries).
 */
export async function sendEmail(
  env: Env,
  opts: {
    to: string;
    subject: string;
    html: string;
    idempotencyKey?: string;
  },
): Promise<{ id: string | null; ok: boolean }> {
  if (!env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send");
    return { id: null, ok: false };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        ...(opts.idempotencyKey ? { "Idempotency-Key": opts.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: senderAddress(env),
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (!res.ok) {
      // Log status only — provider bodies can echo internal details.
      console.warn(`[email] provider rejected send (status ${res.status})`);
      return { id: null, ok: false };
    }
    const data = await res.json() as { id?: string };
    return { id: data.id ?? null, ok: true };
  } catch {
    console.warn("[email] provider request failed");
    return { id: null, ok: false };
  }
}

export async function sendOfferEmail(
  env: Env,
  opts: { to: string; taskId: string; taskTitle: string; description: string; budgetUsd: string | null; origin: string; token: string; idempotencyKey: string },
): Promise<{ id: string | null; ok: boolean }> {
  const reviewUrl = `${opts.origin}/api/v1/tasks/${opts.taskId}/offer?token=${encodeURIComponent(opts.token)}`;
  return sendEmail(env, {
    to: opts.to,
    subject: `GOKUI task offer: ${opts.taskTitle}`,
    html: renderOffer(opts.taskTitle, opts.description, opts.budgetUsd, reviewUrl),
    idempotencyKey: opts.idempotencyKey,
  });
}

export async function sendPaymentEmail(
  env: Env,
  opts: { to: string; taskId: string; taskTitle: string; amountUsd: string; txHash: string },
): Promise<{ id: string | null; ok: boolean }> {
  return sendEmail(env, {
    to: opts.to,
    subject: `GOKUI payment sent: ${opts.taskTitle}`,
    html: renderPaymentSent(opts.taskTitle, opts.amountUsd, opts.txHash),
    idempotencyKey: `payment_sent:${opts.taskId}`,
  });
}

export async function sendCancelledEmail(
  env: Env,
  opts: { to: string; taskId: string; taskTitle: string; reason: string },
): Promise<{ id: string | null; ok: boolean }> {
  return sendEmail(env, {
    to: opts.to,
    subject: `GOKUI task cancelled: ${opts.taskTitle}`,
    html: renderCancelled(opts.taskTitle, opts.reason),
    idempotencyKey: `cancelled:${opts.taskId}`,
  });
}
