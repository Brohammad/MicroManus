import type { WebSearchPort } from "@/domain/agent/tools/search";
import { getSearchCache, setSearchCache } from "../redis/client";

export function createBraveSearchPort(): WebSearchPort {
  return {
    async search(query, count = 5) {
      const cacheKey = `brave:${query}:${count}`;
      const cached = await getSearchCache<{
        title: string;
        url: string;
        snippet: string;
      }[]>(cacheKey);
      if (cached) return cached;

      const apiKey = process.env.BRAVE_SEARCH_API_KEY;
      if (!apiKey) {
        throw new Error("BRAVE_SEARCH_API_KEY is not configured");
      }

      const url = new URL("https://api.search.brave.com/res/v1/web/search");
      url.searchParams.set("q", query);
      url.searchParams.set("count", String(count));

      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": apiKey,
        },
      });
      if (!res.ok) {
        throw new Error(`Brave Search error: ${res.status}`);
      }
      const json = (await res.json()) as {
        web?: { results?: { title?: string; url?: string; description?: string }[] };
      };
      const results = (json.web?.results ?? []).map((r) => ({
        title: r.title ?? "",
        url: r.url ?? "",
        snippet: r.description ?? "",
      }));

      await setSearchCache(cacheKey, results, 60 * 30);
      return results;
    },
  };
}
