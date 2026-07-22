import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { createFacilitatorConfig } from "@coinbase/x402";
import type { AppMiddleware, Env } from "./types";
import { jsonError, sha256 } from "./utils";

const middlewareCache = new Map<string, ReturnType<typeof paymentMiddleware>>();

function validPayTo(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value) && !/^0x0{40}$/i.test(value);
}

function getMiddleware(env: Env, priceUsd: string) {
  const key = [env.X402_NETWORK, env.X402_FACILITATOR_URL, priceUsd, env.X402_PAY_TO].join("|");
  const existing = middlewareCache.get(key);
  if (existing) return existing;
  const facilitatorConfig = env.X402_FACILITATOR_URL.includes("api.cdp.coinbase.com")
    ? createFacilitatorConfig(env.CDP_API_KEY_ID, env.CDP_API_KEY_SECRET)
    : { url: env.X402_FACILITATOR_URL };
  const facilitator = new HTTPFacilitatorClient(facilitatorConfig);
  const server = new x402ResourceServer(facilitator).register(env.X402_NETWORK, new ExactEvmScheme());
  const middleware = paymentMiddleware(
    {
      "POST /api/v1/skills/:slug/invoke": {
        accepts: [{
          scheme: "exact",
          price: `$${priceUsd}`,
          network: env.X402_NETWORK,
          payTo: env.X402_PAY_TO,
        }],
        description: "Invoke one approved GOKUI skill for a fixed USDC price; returns JSON.",
        mimeType: "application/json",
      },
    },
    server,
  );
  middlewareCache.set(key, middleware);
  return middleware;
}

function decodeHeader(value: string | null) {
  if (!value) return null;
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    return JSON.parse(atob(normalized)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const x402Gate: AppMiddleware = async (c, next) => {
  if (!validPayTo(c.env.X402_PAY_TO)) {
    return jsonError(
      c,
      503,
      "payments_not_configured",
      "x402 is wired but the receiving wallet has not been configured yet.",
      { network: c.env.X402_NETWORK, facilitator: c.env.X402_FACILITATOR_URL },
    );
  }
  if (c.env.X402_FACILITATOR_URL.includes("api.cdp.coinbase.com") && (!c.env.CDP_API_KEY_ID || !c.env.CDP_API_KEY_SECRET)) {
    return jsonError(
      c,
      503,
      "facilitator_credentials_missing",
      "Production payment verification is not configured.",
      { network: c.env.X402_NETWORK, facilitator: "CDP" },
    );
  }
  const skill = c.get("skill");
  const priceUsd = Number(skill.price_usd);
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
    return jsonError(c, 503, "skill_price_invalid", "This paid skill does not have a valid positive price.");
  }
  const middleware = getMiddleware(c.env, skill.price_usd);
  const paymentResult = await middleware(c, next);
  if (paymentResult instanceof Response) c.res = paymentResult;
  const invocationId = c.get("invocationId");
  if (!invocationId) return paymentResult ?? c.res;
  const paymentResponse = c.res.headers.get("PAYMENT-RESPONSE");
  if (c.res.status < 400 && paymentResponse) {
    const decoded = decodeHeader(paymentResponse);
    const txHash = String(decoded?.transaction || decoded?.txHash || decoded?.transactionHash || "") || null;
    await c.env.DB.prepare(
      "UPDATE invocations SET status = 'settled', tx_hash = ? WHERE id = ?",
    ).bind(txHash, invocationId).run();
  } else {
    await c.env.DB.prepare(
      "UPDATE invocations SET status = 'payment_failed' WHERE id = ? AND status = 'executed'",
    ).bind(invocationId).run();
  }
  return paymentResult ?? c.res;
};

export async function paymentSignatureHash(c: Parameters<AppMiddleware>[0]) {
  return sha256(c.req.header("PAYMENT-SIGNATURE") || c.req.header("X-PAYMENT") || "missing");
}
