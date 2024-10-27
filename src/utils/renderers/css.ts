import postcss from "postcss";
import { join } from "@std/path";
import { Config as TailwindConfig, default as tailwindcss } from "tailwindcss";
import postcssImport from "postcss-import";
import browserslist from "browserslist";
import initLightningWasm, {
  browserslistToTargets,
  Targets,
  transform,
} from "lightningcss-wasm";
export type { Targets };

import { Config } from "../../config/config.ts";

import { RenderableDocument } from "../dom.ts";

initLightningWasm();

export async function getTailwindConfig(
  tailwindConfig: undefined | string | TailwindConfig,
  srcPath: string,
): Promise<TailwindConfig | undefined> {
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

export function getBrowserTargets(queries: undefined | string | string[]) {
  return browserslistToTargets(browserslist(queries));
}

export async function renderCSS(
  path: string,
  targets: undefined | Targets,
  usedBy?: RenderableDocument[],
  config?: TailwindConfig,
): Promise<string> {
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
    targets,
    minify: true,
  });

  return new TextDecoder().decode(code);
}
