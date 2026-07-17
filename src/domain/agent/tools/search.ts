import { z } from "zod";
import { TOOL_VERSION, type ToolV1, type ToolContext, type ToolResult } from "./types";

export interface WebSearchPort {
  search(query: string, count?: number): Promise<{ title: string; url: string; snippet: string }[]>;
}

const schema = z.object({
  query: z.string().min(1).describe("Search query for recent web information"),
  count: z.number().int().min(1).max(10).optional().describe("Number of results"),
});

export function createSearchTool(search: WebSearchPort): ToolV1<typeof schema> {
  return {
    version: TOOL_VERSION,
    name: "web_search",
    description:
      "Search the public web for current information. Use for news, facts, and sources before answering research questions.",
    schema,
    async execute(input, _ctx: ToolContext): Promise<ToolResult> {
      try {
        const results = await search.search(input.query, input.count ?? 5);
        if (results.length === 0) {
          return { ok: true, content: "No results found." };
        }
        const content = results
          .map((r, i) => `${i + 1}. ${r.title}\n${r.url}\n${r.snippet}`)
          .join("\n\n");
        return { ok: true, content, meta: { count: results.length } };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Search failed";
        return { ok: false, content: message };
      }
    },
  };
}
