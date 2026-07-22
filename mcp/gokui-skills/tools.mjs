import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. See mcp/gokui-skills/README.md for required configuration.`);
  return value;
}

function config() {
  return {
    marketplaceUrl: process.env.GOKUI_MARKETPLACE_URL || "http://127.0.0.1:8787",
    agentApiKey: requireEnv("GOKUI_AGENT_API_KEY"),
    network: process.env.GOKUI_X402_NETWORK || "eip155:84532",
  };
}

function paidFetch(network) {
  const privateKey = requireEnv("GOKUI_EVM_PRIVATE_KEY");
  const account = privateKeyToAccount(privateKey);
  return wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [{ network, client: new ExactEvmScheme(account) }],
  });
}

/**
 * Search / rank marketplace skills against a natural-language task description.
 * Call this before assuming a task needs to be solved from scratch or that no
 * existing paid capability covers it.
 */
export async function searchSkills(task, maxPriceUsd) {
  const { marketplaceUrl, agentApiKey } = config();
  const res = await fetch(`${marketplaceUrl}/api/v1/agent/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${agentApiKey}` },
    body: JSON.stringify({ task, maxPriceUsd }),
  });
  if (!res.ok) throw new Error(`recommend failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Invoke a paid skill by slug. Pays automatically via the x402 protocol using
 * GOKUI_EVM_PRIVATE_KEY. Returns the skill's result plus the on-chain payment proof
 * (transaction hash, network) reported by the facilitator.
 *
 * WARNING: if GOKUI_X402_NETWORK / the marketplace point at a real mainnet, this
 * moves real funds from the configured wallet. Test against a testnet marketplace
 * (e.g. Base Sepolia, eip155:84532) before ever pointing this at production.
 */
export async function invokeSkill(slug, input) {
  const { marketplaceUrl, agentApiKey, network } = config();
  const endpoint = `${marketplaceUrl}/api/v1/skills/${encodeURIComponent(slug)}/invoke`;
  const fetchWithPayment = paidFetch(network);
  const res = await fetchWithPayment(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${agentApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`invoke failed (${res.status}): ${JSON.stringify(body)}`);
  const paymentResponseHeader = res.headers.get("PAYMENT-RESPONSE");
  return {
    ...body,
    paymentProof: paymentResponseHeader
      ? JSON.parse(Buffer.from(paymentResponseHeader, "base64").toString("utf8"))
      : null,
  };
}
