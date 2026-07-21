import { wrapFetchWithPaymentFromConfig, type PaymentPolicy } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";

const baseUrl = new URL(process.env.MARKETPLACE_URL || "http://localhost:8787");
const skillSlug = process.env.SKILL_SLUG || "deal-desk-discount-guardrails";
const agentKey = process.env.AGENT_API_KEY || "";
const privateKey = process.env.EVM_PRIVATE_KEY as `0x${string}` | undefined;
const expectedPayTo = (process.env.EXPECTED_PAY_TO || "").toLowerCase();
const network = process.env.X402_NETWORK || "eip155:84532";
const maxAtomicUsdc = BigInt(process.env.MAX_ATOMIC_USDC || "10000");
const usdcByNetwork: Record<string, string> = {
  "eip155:84532": "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
  "eip155:8453": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
};

if (!agentKey || !privateKey || !expectedPayTo) {
  throw new Error("Set AGENT_API_KEY, EVM_PRIVATE_KEY, and EXPECTED_PAY_TO. Never paste the private key into a prompt or browser bundle.");
}
if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) throw new Error("EVM_PRIVATE_KEY must be a 32-byte hex private key.");
if (!/^0x[0-9a-f]{40}$/.test(expectedPayTo)) throw new Error("EXPECTED_PAY_TO must be a lowercase-compatible EVM address.");
if (!usdcByNetwork[network]) throw new Error(`Unsupported payment network: ${network}`);

const endpoint = new URL(`/api/v1/skills/${encodeURIComponent(skillSlug)}/invoke`, baseUrl);
if (endpoint.origin !== baseUrl.origin || !endpoint.pathname.startsWith("/api/v1/skills/")) {
  throw new Error("Refusing to pay an endpoint outside the configured marketplace origin.");
}

const strictPaymentPolicy: PaymentPolicy = (_version, requirements) => requirements.filter((requirement) => {
  return requirement.scheme === "exact"
    && requirement.network === network
    && requirement.asset.toLowerCase() === usdcByNetwork[network]
    && requirement.payTo.toLowerCase() === expectedPayTo
    && BigInt(requirement.amount) <= maxAtomicUsdc;
});

const account = privateKeyToAccount(privateKey);
const paidFetch = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network, client: new ExactEvmScheme(account) }],
  policies: [strictPaymentPolicy],
});

const response = await paidFetch(endpoint, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${agentKey}`,
    "Content-Type": "application/json",
    "Idempotency-Key": crypto.randomUUID(),
  },
  body: JSON.stringify({
    input: process.env.SKILL_INPUT || "A customer asks for a 35% annual-plan discount with no term commitment.",
  }),
});

const body = await response.json();
if (!response.ok) throw new Error(`Invocation failed (${response.status}): ${JSON.stringify(body)}`);

console.log(JSON.stringify({
  status: response.status,
  payer: account.address,
  paymentResponse: response.headers.get("PAYMENT-RESPONSE"),
  result: body,
}, null, 2));
