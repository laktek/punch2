import postcss from "postcss";
import { join } from "@std/path";
import postcssImport from "postcss-import";
import { default as tailwindcss } from "@tailwindcss/postcss";
import browserslist from "browserslist";
import { browserslistToTargets, Targets, transform } from "lightningcss";
export type { Targets };

import { Config } from "../../config/config.ts";

import { RenderableDocument } from "../dom.ts";

export function getBrowserTargets(queries: undefined | string | string[]) {
  return browserslistToTargets(browserslist(queries));
}

declare global {
  var __tw_resolve: (id: any, base: any) => string | undefined;
}

globalThis.__tw_resolve = function (id: any, base: any) {
  if (id === "tailwindcss") {
    return join(
      import.meta.dirname!,
      "../../../node_modules/tailwindcss/index.css",
    );
  }
  return undefined;
};

export async function renderCSS(
  path: string,
  targets: undefined | Targets,
): Promise<string> {
  const raw = await Deno.readTextFile(path);
  const { css } = await postcss([
    // we run postcss import manually to support cases where tailwind isn't used.
    postcssImport(),
    tailwindcss({
      // we skip tailwind optimize so we can minify CSS regardless tailwind is used.
      optimize: false,
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
