import postcss from "postcss";
import { join } from "@std/path";
import { Config as TailwindConfig, default as tailwindcss } from "tailwindcss";
import postcssImport from "postcss-import";
import initLightningWasm, { transform } from "lightningcss-wasm";

import { Config } from "../../config/config.ts";

import { RenderableDocument } from "../dom.ts";

initLightningWasm();

export async function getTailwindConfig(
  config: Config,
  srcPath: string,
): Promise<TailwindConfig | undefined> {
  const tailwindConfig = config.assets?.css?.tailwind;
  if (!tailwindConfig) {
    return;
  }

  // read the config from given path
  // has to be a JSON file (tailwind.config.js isn't supported)
  // NOTE: Currently cannot configure tailwind plugins and presets
  if (typeof tailwindConfig === "string") {
    try {
      return JSON.parse(
        await Deno.readTextFile(join(srcPath, tailwindConfig)),
      );
    } catch (e) {
      console.error("failed to read and parse tailwind config", e);
    }
  } else {
    return tailwindConfig;
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
    const { css } = await postcss([
      postcssImport(),
      tailwindcss({
        ...(config ?? {}),
        content,
      }),
    ]).process(raw, {
      from: path,
    });

    let { code, map } = transform({
      filename: path,
      code: new TextEncoder().encode(css),
      minify: true,
    });

    return new TextDecoder().decode(code);
  } catch (e) {
    throw new Error(`failed to render CSS file - ${path}`, { cause: e });
  }
}
