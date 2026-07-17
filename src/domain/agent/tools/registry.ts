import { z } from "zod";
import type { AnyTool } from "./types";

export function createToolRegistry(tools: AnyTool[]): Map<string, AnyTool> {
  const map = new Map<string, AnyTool>();
  for (const tool of tools) {
    if (map.has(tool.name)) {
      throw new Error(`Duplicate tool name: ${tool.name}`);
    }
    map.set(tool.name, tool);
  }
  return map;
}

export function toolsToOpenAiDefinitions(tools: AnyTool[]) {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: zodToJsonSchema(tool.schema),
    },
  }));
}

function zodToJsonSchema(schema: AnyTool["schema"]): Record<string, unknown> {
  try {
    return z.toJSONSchema(schema) as Record<string, unknown>;
  } catch {
    return {
      type: "object",
      properties: {},
      additionalProperties: true,
    };
  }
}
