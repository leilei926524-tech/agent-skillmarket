import type { Env } from "./types";

export const INVOCATION_RESULT_RETENTION_MS = 24 * 60 * 60 * 1000;

export function invocationResultExpiresAt(createdAt: string) {
  return new Date(Date.parse(createdAt) + INVOCATION_RESULT_RETENTION_MS).toISOString();
}

export function invocationResultExpired(expiresAt: string | null | undefined, now = Date.now()) {
  if (!expiresAt) return false;
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry) && expiry <= now;
}

export async function purgeExpiredInvocationResults(env: Env, at = new Date()) {
  const purgedAt = at.toISOString();
  return env.DB.batch([
    env.DB.prepare(
      `UPDATE invocations
          SET input_json = 'null',
              result_expires_at = COALESCE(result_expires_at, strftime('%Y-%m-%dT%H:%M:%fZ', datetime(created_at, '+24 hours')))
        WHERE input_json <> 'null'
           OR result_expires_at IS NULL`,
    ),
    env.DB.prepare(
      `UPDATE invocations
        SET output_json = 'null', purged_at = ?
      WHERE result_expires_at IS NOT NULL
        AND result_expires_at <= ?
        AND purged_at IS NULL`,
    ).bind(purgedAt, purgedAt),
  ]);
}
