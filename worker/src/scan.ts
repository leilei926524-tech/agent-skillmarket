import { parse as parseYaml } from "yaml";

export type ScanResult = {
  safe: boolean;
  riskLevel: "normal" | "caution" | "blocked";
  warnings: string[];
  checks: { id: string; status: "passed" | "warning" | "blocked"; detail: string }[];
  manifest?: {
    name: string;
    description: string;
    version: string;
    license: string;
  };
};

function frontmatter(markdown: string) {
  if (!markdown.startsWith("---\n")) throw new Error("SKILL.md must start with YAML frontmatter.");
  const end = markdown.indexOf("\n---", 4);
  if (end < 0) throw new Error("SKILL.md frontmatter is not closed with ---.");
  const parsed = parseYaml(markdown.slice(4, end));
  if (!parsed || typeof parsed !== "object") throw new Error("SKILL.md frontmatter must be a YAML object.");
  return parsed as Record<string, unknown>;
}

export function scanSkill(markdown: string): ScanResult {
  const warnings: string[] = [];
  const checks: ScanResult["checks"] = [];
  const bytes = new TextEncoder().encode(markdown).byteLength;
  const lines = markdown.split("\n").length;
  if (!markdown.trim()) {
    return { safe: false, riskLevel: "blocked", warnings: ["The skill file is empty."], checks: [] };
  }
  if (bytes > 200_000 || lines > 800) {
    return {
      safe: false,
      riskLevel: "blocked",
      warnings: ["SKILL.md must be under 200 KB and 800 lines."],
      checks: [{ id: "size", status: "blocked", detail: `${bytes} bytes · ${lines} lines` }],
    };
  }
  checks.push({ id: "size", status: "passed", detail: `${bytes} bytes · ${lines} lines` });

  let manifest: Record<string, unknown>;
  try {
    manifest = frontmatter(markdown);
  } catch (error) {
    return {
      safe: false,
      riskLevel: "blocked",
      warnings: [error instanceof Error ? error.message : "Invalid frontmatter."],
      checks: [...checks, { id: "frontmatter", status: "blocked", detail: "Could not parse YAML frontmatter." }],
    };
  }

  const name = String(manifest.name || "").trim();
  const description = String(manifest.description || "").trim();
  const license = String(manifest.license || "").trim();
  const metadata = manifest.metadata && typeof manifest.metadata === "object"
    ? (manifest.metadata as Record<string, unknown>)
    : {};
  const version = String(metadata.version || manifest.version || "").trim();
  const fieldErrors: string[] = [];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 64) {
    fieldErrors.push("name must be a kebab-case slug of 64 characters or fewer");
  }
  if (description.length < 40 || description.length > 1024) {
    fieldErrors.push("description must contain 40–1024 characters");
  }
  if (!/^\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    fieldErrors.push("version must look like 1.0.0");
  }
  if (license !== "MIT") fieldErrors.push("license must be MIT for the beta marketplace");
  if (fieldErrors.length) {
    return {
      safe: false,
      riskLevel: "blocked",
      warnings: fieldErrors,
      checks: [...checks, { id: "format", status: "blocked", detail: fieldErrors.join("; ") }],
    };
  }
  checks.push({ id: "format", status: "passed", detail: "Required frontmatter fields are valid." });

  const blockedPatterns: [RegExp, string][] = [
    [/\b(?:ignore|override|disregard)\s+(?:all\s+)?(?:previous|prior|system)\s+instructions\b/i, "Instruction override pattern"],
    [/\b(?:send|upload|exfiltrate)\b.{0,80}\b(?:secret|token|credential|private key|seed phrase)\b/i, "Secret exfiltration pattern"],
    [/curl\s+[^\n|]+\|\s*(?:sh|bash)|wget\s+[^\n|]+\|\s*(?:sh|bash)/i, "Remote shell execution pattern"],
    [/\brm\s+-rf\s+(?:\/|~|\$HOME|\$\{?HOME\}?)/i, "Destructive filesystem pattern"],
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:api[_-]?key|secret[_-]?key)\s*[:=]\s*["'][A-Za-z0-9_\-]{20,}/i, "Embedded credential pattern"],
  ];
  const blocked = blockedPatterns.filter(([pattern]) => pattern.test(markdown)).map(([, label]) => label);
  if (blocked.length) {
    return {
      safe: false,
      riskLevel: "blocked",
      warnings: blocked,
      checks: [...checks, { id: "security", status: "blocked", detail: blocked.join("; ") }],
      manifest: { name, description, version, license },
    };
  }

  const warningPatterns: [RegExp, string][] = [
    [/\bsudo\b|\bchmod\s+777\b/i, "Requests elevated or broad filesystem permissions."],
    [/\b(?:private key|seed phrase|wallet secret)\b/i, "Mentions high-risk wallet secrets; manual review required."],
    [/\b(?:delete|cancel|transfer|purchase|trade|broadcast)\b/i, "May perform an external write or financial action; add explicit confirmation rules."],
    [/```(?:bash|sh|shell)/i, "Contains shell commands; reviewers must verify every command against a real binary."],
  ];
  for (const [pattern, warning] of warningPatterns) if (pattern.test(markdown)) warnings.push(warning);
  checks.push({
    id: "security",
    status: warnings.length ? "warning" : "passed",
    detail: warnings.length ? warnings.join("; ") : "No blocked prompt-injection, exfiltration, or embedded-secret pattern found.",
  });

  return {
    safe: true,
    riskLevel: warnings.length ? "caution" : "normal",
    warnings,
    checks,
    manifest: { name, description, version, license },
  };
}
