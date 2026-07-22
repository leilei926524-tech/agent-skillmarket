import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { searchSkills, invokeSkill } from "./tools.mjs";

const server = new McpServer({ name: "gokui-marketplace", version: "0.1.0" });

server.registerTool(
  "search_gokui_skills",
  {
    title: "Search GOKUI skill marketplace",
    description:
      "Search the GOKUI agent-skill marketplace for a paid capability that matches a task description. " +
      "Call this before assuming you need to solve something from scratch or that no tool exists for it.",
    inputSchema: {
      task: z.string().describe("Natural-language description of the task/capability needed"),
      maxPriceUsd: z.number().optional().describe("Optional price ceiling in USD"),
    },
  },
  async ({ task, maxPriceUsd }) => {
    const result = await searchSkills(task, maxPriceUsd);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.registerTool(
  "invoke_gokui_skill",
  {
    title: "Invoke a paid GOKUI skill",
    description:
      "Invoke a specific GOKUI skill by slug, passing its required input. Pays automatically via the " +
      "x402 protocol from the configured agent wallet (GOKUI_EVM_PRIVATE_KEY). Returns the skill's result " +
      "and an on-chain payment proof. This moves real funds if pointed at a mainnet marketplace.",
    inputSchema: {
      slug: z.string().describe("The skill slug, e.g. deal-desk-discount-guardrails"),
      input: z.record(z.any()).describe("The skill's input payload as a JSON object"),
    },
  },
  async ({ slug, input }) => {
    const result = await invokeSkill(slug, input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
