import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = join(import.meta.dir, "..");
const publicSurfaces = [
  "README.md",
  "web/INTEGRATION.md",
  "web/app",
  "web/components",
  "web/lib/i18n",
  "worker/src",
];
const forbidden = [
  /\bOKX\b/i,
  /ОККС/i,
  /借鉴/,
  /\binspired(?: by|-)/i,
  /simulated payouts?/i,
  /simulated ratings?/i,
  /synthetic ratings?/i,
  /fake balance/i,
  /没有模拟付款|虚假余额|虚构评分/,
  /ambient feed/i,
  /manufactur(?:e|ing) demo/i,
  /demo activity/i,
  /next packaging milestone/i,
  /unaudited smart contract/i,
  /first production flow/i,
  /creator obligations/i,
  /beta reviewer|manual beta review|fixed beta price|beta upload/i,
  /冒充未经审计|首个生产流程|下一阶段的打包/,
  /job-20\d{6}-\d+/,
  /ZXQ|ЗКС|98573928475610293847|:::4\d{4}:::/,
];
const allowedExtensions = new Set([".json", ".md", ".ts", ".tsx"]);

async function collect(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) files.push(...await collect(child));
    else if (allowedExtensions.has(extname(entry.name))) files.push(child);
  }
  return files;
}

const files: string[] = [];
for (const surface of publicSurfaces) {
  const path = join(root, surface);
  if (extname(path)) files.push(path);
  else files.push(...await collect(path));
}

const problems: string[] = [];
for (const file of files) {
  const content = await readFile(file, "utf8");
  const lines = content.split("\n");
  for (const [index, line] of lines.entries()) {
    for (const pattern of forbidden) {
      if (pattern.test(line)) problems.push(`${relative(root, file)}:${index + 1}: ${pattern}`);
      pattern.lastIndex = 0;
    }
  }
}

if (problems.length) throw new Error(`public copy validation failed:\n${problems.join("\n")}`);
console.log(`public copy ok: ${files.length} files checked`);
