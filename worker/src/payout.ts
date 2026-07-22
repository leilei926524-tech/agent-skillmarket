import type { Env, SkillRecord } from "./types";
import { nowIso } from "./utils";

// USDC contract addresses
const USDC: Record<string, `0x${string}`> = {
  "eip155:8453":  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet
  "eip155:84532": "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia
};

// RPC endpoints (public, no key needed for basic transfers)
const RPC: Record<string, string> = {
  "eip155:8453":  "https://mainnet.base.org",
  "eip155:84532": "https://sepolia.base.org",
};

// ERC-20 transfer ABI selector: transfer(address,uint256)
const TRANSFER_SELECTOR = "0xa9059cbb";

// Chain IDs
const CHAIN_ID: Record<string, number> = {
  "eip155:8453":  8453,
  "eip155:84532": 84532,
};

function toHex(n: bigint, bytes: number): string {
  return n.toString(16).padStart(bytes * 2, "0");
}

function encodeTransfer(to: string, amount: bigint): string {
  const paddedTo = to.toLowerCase().replace("0x", "").padStart(64, "0");
  const paddedAmount = toHex(amount, 32);
  return TRANSFER_SELECTOR + paddedTo + paddedAmount;
}

async function getSellerShare(env: Env, priceUsd: string): Promise<string> {
  const bps = Number(env.SELLER_REVENUE_SHARE_BPS ?? "8500");
  return ((Number(priceUsd) * bps) / 10_000).toFixed(6);
}

/**
 * Signs and sends a USDC ERC-20 transfer from the platform wallet to the seller.
 * Uses raw JSON-RPC calls + viem's account signing to stay within Workers constraints.
 * Platform wallet needs a small ETH balance for gas (~0.000005 ETH per transfer on Base).
 */
export async function triggerSellerPayout(
  env: Env,
  invocationId: string,
  skill: SkillRecord,
): Promise<void> {
  if (!skill.payout_wallet || !env.PLATFORM_PRIVATE_KEY) return;

  const sellerAmountUsd = await getSellerShare(env, skill.price_usd);
  const payoutId = crypto.randomUUID();
  const now = nowIso();

  // Record payout intent before attempting — idempotency guard
  await env.DB.prepare(
    `INSERT OR IGNORE INTO payouts
       (id, invocation_id, skill_id, recipient_wallet, amount_usd, network, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
  ).bind(payoutId, invocationId, skill.id, skill.payout_wallet, sellerAmountUsd, env.X402_NETWORK, now).run();

  try {
    const { privateKeyToAccount } = await import("viem/accounts");
    const { createWalletClient, createPublicClient, http, parseUnits } = await import("viem");
    const { base, baseSepolia } = await import("viem/chains");

    const usdcAddress = USDC[env.X402_NETWORK];
    const rpcUrl = RPC[env.X402_NETWORK];
    if (!usdcAddress || !rpcUrl) throw new Error(`Unsupported network for payout: ${env.X402_NETWORK}`);

    const chain = env.X402_NETWORK === "eip155:8453" ? base : baseSepolia;
    const account = privateKeyToAccount(env.PLATFORM_PRIVATE_KEY);

    const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
    const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

    // USDC has 6 decimal places
    const atomicAmount = parseUnits(sellerAmountUsd, 6);
    const to = skill.payout_wallet as `0x${string}`;

    const hash = await walletClient.writeContract({
      address: usdcAddress,
      abi: [{ name: "transfer", type: "function", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] }] as const,
      functionName: "transfer",
      args: [to, atomicAmount],
    });

    // Wait up to 60 s for confirmation, don't block the buyer response
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
    const success = receipt.status === "success";

    await env.DB.prepare(
      `UPDATE payouts SET status = ?, tx_hash = ?, settled_at = ? WHERE invocation_id = ?`,
    ).bind(success ? "settled" : "failed", hash, nowIso(), invocationId).run();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[payout] failed for invocation ${invocationId}: ${msg}`);
    await env.DB.prepare(
      `UPDATE payouts SET status = 'failed', error = ? WHERE invocation_id = ?`,
    ).bind(msg.slice(0, 500), invocationId).run();
  }
}

/**
 * General-purpose USDC transfer from platform wallet to any recipient.
 * Used for freelancer task payments. Returns tx hash or null on failure.
 */
export async function sendUSDCPayment(
  env: Env,
  recipientAddress: string,
  amountUsd: string,
): Promise<{ txHash: string | null; ok: boolean; error?: string }> {
  if (!env.PLATFORM_PRIVATE_KEY) return { txHash: null, ok: false, error: "PLATFORM_PRIVATE_KEY not set" };

  const usdcAddress = USDC[env.X402_NETWORK];
  const rpcUrl = RPC[env.X402_NETWORK];
  if (!usdcAddress || !rpcUrl) return { txHash: null, ok: false, error: `Unsupported network: ${env.X402_NETWORK}` };

  try {
    const { privateKeyToAccount } = await import("viem/accounts");
    const { createWalletClient, createPublicClient, http, parseUnits } = await import("viem");
    const { base, baseSepolia } = await import("viem/chains");

    const chain = env.X402_NETWORK === "eip155:8453" ? base : baseSepolia;
    const account = privateKeyToAccount(env.PLATFORM_PRIVATE_KEY);
    const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
    const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

    const atomicAmount = parseUnits(amountUsd, 6);
    const hash = await walletClient.writeContract({
      address: usdcAddress,
      abi: [{ name: "transfer", type: "function", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] }] as const,
      functionName: "transfer",
      args: [recipientAddress as `0x${string}`, atomicAmount],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
    return { txHash: hash, ok: receipt.status === "success" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { txHash: null, ok: false, error: msg };
  }
}
