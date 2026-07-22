import type { Env } from "./types";

type EmailTemplate = "offer" | "reminder" | "payment_sent" | "cancelled";

const GOKUI_FROM = "GOKUI Marketplace <noreply@gokui.mesalaunch.com>";

function renderOffer(taskTitle: string, description: string, budgetUsd: string | null, acceptUrl: string): string {
  return `
<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 8px;font-size:20px">New task offer: ${taskTitle}</h2>
  <p style="color:#6b7d9e;font-size:13px;margin:0 0 20px">A GOKUI agent found your profile and thinks you're a great match.</p>
  <div style="background:#0d1626;border:1px solid rgba(150,185,255,0.11);border-radius:12px;padding:20px;margin-bottom:20px">
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#eff4fc">${description}</p>
    ${budgetUsd ? `<p style="margin:0;font-family:monospace;font-size:18px;font-weight:700;color:#4d8dff">Budget: $${budgetUsd} USDC</p>` : ""}
  </div>
  <a href="${acceptUrl}" style="display:inline-block;background:linear-gradient(180deg,#5b9bff,#2f6bed);color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px">
    Accept task →
  </a>
  <p style="color:#6b7d9e;font-size:12px;margin-top:20px">
    This offer expires in 48 hours. Reply to this email with questions.
  </p>
</div>`;
}

function renderPaymentSent(taskTitle: string, amountUsd: string, txHash: string | null): string {
  return `
<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 8px;font-size:20px">Payment sent: ${taskTitle}</h2>
  <p style="color:#3ddc97;font-size:14px;font-weight:600">✓ $${amountUsd} USDC has been sent to your wallet.</p>
  ${txHash ? `<p style="font-family:monospace;font-size:12px;color:#6b7d9e;word-break:break-all">TX: ${txHash}</p>` : ""}
  <p style="color:#aab9d6;font-size:13px">Thank you for completing the task. Check your wallet for the transfer (may take 1–2 minutes).</p>
</div>`;
}

function renderCancelled(taskTitle: string, reason: string): string {
  return `
<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 8px;font-size:20px">Task cancelled: ${taskTitle}</h2>
  <p style="color:#aab9d6;font-size:13px">${reason}</p>
</div>`;
}

export async function sendEmail(
  env: Env,
  opts: {
    to: string;
    subject: string;
    html: string;
  },
): Promise<{ id: string | null; ok: boolean }> {
  if (!env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send");
    return { id: null, ok: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: GOKUI_FROM,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });
  const data = await res.json() as { id?: string };
  return { id: data.id ?? null, ok: res.ok };
}

export async function sendOfferEmail(
  env: Env,
  opts: { to: string; taskId: string; taskTitle: string; description: string; budgetUsd: string | null; origin: string },
): Promise<{ id: string | null; ok: boolean }> {
  const acceptUrl = `${opts.origin}/api/v1/tasks/${opts.taskId}/accept`;
  return sendEmail(env, {
    to: opts.to,
    subject: `GOKUI task offer: ${opts.taskTitle}`,
    html: renderOffer(opts.taskTitle, opts.description, opts.budgetUsd, acceptUrl),
  });
}

export async function sendPaymentEmail(
  env: Env,
  opts: { to: string; taskTitle: string; amountUsd: string; txHash: string | null },
): Promise<{ id: string | null; ok: boolean }> {
  return sendEmail(env, {
    to: opts.to,
    subject: `GOKUI payment sent: ${opts.taskTitle}`,
    html: renderPaymentSent(opts.taskTitle, opts.amountUsd, opts.txHash),
  });
}

export async function sendCancelledEmail(
  env: Env,
  opts: { to: string; taskTitle: string; reason: string },
): Promise<{ id: string | null; ok: boolean }> {
  return sendEmail(env, {
    to: opts.to,
    subject: `GOKUI task cancelled: ${opts.taskTitle}`,
    html: renderCancelled(opts.taskTitle, opts.reason),
  });
}
