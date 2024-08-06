import postcss from "postcss";
import autoprefixer from "autoprefixer";
import cssnano from "cssnano";
import { join } from "@std/path";
import { Config as TailwindConfig, default as tailwindcss } from "tailwindcss";

import { Config } from "../../config/config.ts";

import { RenderableDocument } from "../dom.ts";

export async function getTailwindConfig(
  config: Config,
  srcPath: string,
): Promise<TailwindConfig | undefined> {
  if (!config.tailwind) {
    return;
  }

  // read the config from given path
  // has to be a JSON file (tailwind.config.js isn't supported)
  if (typeof config.tailwind === "string") {
    try {
      return JSON.parse(
        await Deno.readTextFile(join(srcPath, config.tailwind)),
      );
    } catch (e) {
      console.error("failed to read and parse tailwind config", e);
    }
  } else {
    return config.tailwind;
  }
}

export async function renderCSS(
  path: string,
  usedBy?: RenderableDocument[],
  config?: TailwindConfig,
): Promise<string> {
  try {
    const raw = await Deno.readTextFile(path);
    const content = (usedBy || []).map((doc) => ({
      raw: doc.toString(),
      extension: "html",
    }));
    const result = await postcss([
      autoprefixer,
      tailwindcss({
        ...(config ?? {}),
        content,
      }),
      cssnano({
        preset: "default",
      }),
    ]).process(raw, {
      from: path,
      map: { inline: true },
    });
    return result.css;
  } catch (e) {
    throw new Error(`failed to render CSS file - ${path}`, { cause: e });
  }
}
