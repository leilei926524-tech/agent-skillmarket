import type { SkillRecord } from "./types";
import { parseJson } from "./utils";

const STOPWORDS = new Set([
  "about", "after", "agent", "agents", "also", "and", "are", "before", "can", "could",
  "for", "from", "help", "how", "into", "need", "produce", "should", "skill", "skills",
  "task", "that", "the", "their", "then", "this", "through", "understand", "use", "user",
  "users", "using", "want", "what", "when", "where", "which", "with", "would",
]);

function normalize(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function latinTokens(value: string) {
  return [...new Set(
    normalize(value)
      .match(/[a-z0-9][a-z0-9.+#-]{1,}/g)
      ?.filter((token) => token.length >= 3 && !STOPWORDS.has(token)) || [],
  )];
}

function searchableText(skill: SkillRecord) {
  const localized = parseJson<Record<string, Record<string, string>>>(skill.localizations_json || "{}", {});
  return normalize([
    skill.slug,
    skill.title,
    skill.description,
    skill.category,
    skill.tags_json,
    ...Object.values(localized).flatMap((entry) => Object.values(entry)),
  ].join(" "));
}

export function matchesSkillQuery(skill: SkillRecord, query: string) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;
  const aliases = parseJson<string[]>(skill.search_aliases_json || "[]", [])
    .map(normalize)
    .filter(Boolean);
  return searchableText(skill).includes(normalizedQuery)
    || aliases.some((alias) => alias.includes(normalizedQuery) || normalizedQuery.includes(alias));
}

export function rankSkillsForTask(skills: SkillRecord[], task: string, maxPriceUsd = 0) {
  const normalizedTask = normalize(task);
  const tokens = latinTokens(task);

  return skills
    .filter((skill) => !maxPriceUsd || Number(skill.price_usd) <= maxPriceUsd)
    .map((skill) => {
      const aliases = parseJson<string[]>(skill.search_aliases_json || "[]", [])
        .map(normalize)
        .filter(Boolean);
      const aliasMatches = aliases.filter((alias) => alias.length >= 2 && normalizedTask.includes(alias));
      const haystack = searchableText(skill);
      const tokenMatches = tokens.filter((token) => haystack.includes(token));
      const matched = [...new Set([...aliasMatches, ...tokenMatches])];
      const relevance = aliasMatches.length * 50 + tokenMatches.length * 15;
      const qualityTiebreaker = (skill.risk_level === "normal" ? 3 : 0) + Math.min(2, skill.invokes);
      return { skill, matched, score: relevance + qualityTiebreaker, relevance };
    })
    .filter((candidate) => candidate.relevance > 0)
    .sort((a, b) => b.score - a.score || b.skill.invokes - a.skill.invokes || a.skill.title.localeCompare(b.skill.title))
    .slice(0, 3);
}
