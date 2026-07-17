import { z } from "zod";
import { TOOL_VERSION, type ToolV1, type ToolContext, type ToolResult } from "./types";

export interface PdfReportPort {
  createReport(input: {
    chatId: string;
    userId: string;
    title: string;
    markdown: string;
  }): Promise<{ artifactId: string; title: string; storagePath: string }>;
}

const schema = z.object({
  title: z.string().min(1).describe("Report title"),
  markdown: z
    .string()
    .min(1)
    .describe("Full report body in markdown (headings, paragraphs, bullets)"),
});

export function createPdfTool(pdf: PdfReportPort): ToolV1<typeof schema> {
  return {
    version: TOOL_VERSION,
    name: "create_pdf_report",
    description:
      "Generate a PDF research report artifact for the user to download. Use when the user asks for a report or a shareable document.",
    schema,
    async execute(input, ctx: ToolContext): Promise<ToolResult> {
      try {
        const artifact = await pdf.createReport({
          chatId: ctx.chatId,
          userId: ctx.userId,
          title: input.title,
          markdown: input.markdown,
        });
        return {
          ok: true,
          content: `PDF created: "${artifact.title}" (artifact id: ${artifact.artifactId})`,
          meta: artifact,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "PDF generation failed";
        return { ok: false, content: message };
      }
    },
  };
}
