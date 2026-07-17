import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import type { PageFetchPort } from "@/domain/agent/tools/fetch";
import { getSearchCache, setSearchCache } from "../redis/client";

export function createReadabilityFetchPort(): PageFetchPort {
  return {
    async fetchReadable(url: string) {
      const cacheKey = `fetch:${url}`;
      const cached = await getSearchCache<{
        title: string;
        text: string;
        url: string;
      }>(cacheKey);
      if (cached) return cached;

      const res = await fetch(url, {
        headers: {
          "User-Agent": "MicroManusResearchBot/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.status}`);
      }
      const html = await res.text();
      const dom = new JSDOM(html, { url });
      const article = new Readability(dom.window.document).parse();
      const page = {
        title: article?.title ?? dom.window.document.title ?? url,
        text: article?.textContent?.trim() || "No readable content extracted.",
        url,
      };
      await setSearchCache(cacheKey, page, 60 * 60);
      return page;
    },
  };
}
