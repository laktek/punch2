import { join } from "std/path/mod.ts";

import { Resources } from "./resources.ts";
import { Config } from "../config/config.ts";
import { ResourceType } from "../utils/routes.ts";

export async function generateSitemap(
  config: Config,
  destPath: string,
  resources: Resources,
  customBaseURL?: string,
) {
  performance.mark("sitemap-started");
  let baseURL = customBaseURL || config.baseURL;
  if (!baseURL) {
    // TODO: change the default base url
    baseURL = "http://localhost:8080";
    console.warn(
      `Generate sitemap: base URL is not provided. Using ${baseURL} as the default. (Use --base-url flag to set a base URL)`,
    );
  }

  const pages = resources.all(ResourceType.HTML);
  const entries = pages.map((page) => {
    return `<url><loc>${
      new URL(page.route, baseURL).toString()
    }</loc><lastmod>${page.lastmod}</lastmod></url>`;
  });
  await Deno.writeTextFile(
    join(destPath, "sitemap.xml"),
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${
      entries.join("\n")
    }</urlset>`,
  );
  performance.mark("sitemap-finished");
  const sitemapDuration = performance.measure(
    "sitemap-duration",
    "sitemap-started",
    "sitemap-finished",
  );
  console.log("sitemap duration", sitemapDuration.duration);
}
