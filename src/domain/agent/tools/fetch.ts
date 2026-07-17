import { z } from "zod";
import { TOOL_VERSION, type ToolV1, type ToolContext, type ToolResult } from "./types";

export interface PageFetchPort {
  fetchReadable(url: string): Promise<{ title: string; text: string; url: string }>;
}

const schema = z.object({
  url: z.string().url().describe("Absolute URL of the page to read"),
});

export function createFetchTool(fetchPort: PageFetchPort): ToolV1<typeof schema> {
  return {
    version: TOOL_VERSION,
    name: "fetch_page",
    description:
      "Fetch a web page and extract the main readable article text. Use after web_search to dig into sources.",
    schema,
    async execute(input, _ctx: ToolContext): Promise<ToolResult> {
      try {
        const page = await fetchPort.fetchReadable(input.url);
        const truncated =
          page.text.length > 12_000
            ? `${page.text.slice(0, 12_000)}\n\n[truncated]`
            : page.text;
        return {
          ok: true,
          content: `# ${page.title}\nURL: ${page.url}\n\n${truncated}`,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Fetch failed";
        return { ok: false, content: message };
      }
    },
  };
}
