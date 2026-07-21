export type PublicSkill = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  version: string;
  license: string;
  publisher: string;
  price: { amount: string; currency: string; network: string };
  risk: { level: string; summary: string };
  invokes: number;
  invokeUrl: string;
  updatedAt: string;
};

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `Request failed with HTTP ${response.status}`;
    const error = new Error(message) as Error & { status?: number; data?: unknown };
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data as T;
}

export const usd = (amount: string | number) => `$${Number(amount).toFixed(Number(amount) < 0.1 ? 3 : 2)}`;
