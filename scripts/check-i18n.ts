import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LOCALES } from "../web/lib/i18n/config";

const directory = join(import.meta.dir, "..", "web", "lib", "i18n");
const english = JSON.parse(await readFile(join(directory, "en.json"), "utf8")) as Record<string, string>;
const expectedKeys = Object.keys(english);
const problems: string[] = [];
const localeArgument = process.argv.find((argument) => argument.startsWith("--locales="));
const requestedCodes = localeArgument?.slice("--locales=".length).split(",").filter(Boolean);
const locales = requestedCodes
  ? requestedCodes.map((code) => LOCALES.find((locale) => locale.code === code)).filter((locale): locale is (typeof LOCALES)[number] => Boolean(locale))
  : LOCALES;

if (requestedCodes && locales.length !== requestedCodes.length) {
  const knownCodes = new Set(locales.map((locale) => locale.code));
  const unknownCodes = requestedCodes.filter((code) => !knownCodes.has(code));
  problems.push(`unknown locale codes: ${unknownCodes.join(", ")}`);
}

for (const locale of locales) {
  const path = join(directory, `${locale.code}.json`);
  let dictionary: Record<string, string>;
  try {
    dictionary = JSON.parse(await readFile(path, "utf8")) as Record<string, string>;
  } catch (error) {
    problems.push(`${locale.code}: missing or invalid JSON (${(error as Error).message})`);
    continue;
  }
  const keys = Object.keys(dictionary);
  const missing = expectedKeys.filter((key) => !(key in dictionary));
  const extra = keys.filter((key) => !(key in english));
  const empty = keys.filter((key) => !dictionary[key]?.trim());
  const leakedTokens = keys.filter((key) => /ZXQ|ЗКС|98573928475610293847|:::4\d{4}:::/.test(dictionary[key]));
  if (missing.length) problems.push(`${locale.code}: missing ${missing.join(", ")}`);
  if (extra.length) problems.push(`${locale.code}: extra ${extra.join(", ")}`);
  if (empty.length) problems.push(`${locale.code}: empty ${empty.join(", ")}`);
  if (leakedTokens.length) problems.push(`${locale.code}: translation placeholders in ${leakedTokens.join(", ")}`);
}

if (!requestedCodes && LOCALES.length !== 60) problems.push(`expected 60 locales, found ${LOCALES.length}`);
if (problems.length) throw new Error(`i18n validation failed:\n${problems.join("\n")}`);

console.log(`i18n ok: ${locales.length} locales × ${expectedKeys.length} keys`);
