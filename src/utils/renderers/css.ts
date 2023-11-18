import postcss from "postcss";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";

import { RenderableDocument } from "../dom.ts";

export async function renderCSS(
  path: string,
  usedBy?: RenderableDocument[],
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
        content,
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
