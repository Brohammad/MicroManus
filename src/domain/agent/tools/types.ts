import { z } from "zod";

export const TOOL_VERSION = "1.0" as const;

export interface ToolContext {
  userId: string;
  chatId: string;
}

export interface ToolResult {
  content: string;
  ok: boolean;
  meta?: Record<string, unknown>;
}

export interface ToolV1<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  version: typeof TOOL_VERSION;
  name: string;
  description: string;
  schema: TSchema;
  execute(
    input: z.infer<TSchema>,
    ctx: ToolContext,
  ): Promise<ToolResult>;
}

export type AnyTool = ToolV1;
