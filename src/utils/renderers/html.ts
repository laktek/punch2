import { Contents } from "../../lib/contents.ts";
import { type Context, runInContext } from "node:vm";

export function renderHTML(
  path: string,
  context: Context,
): string {
  try {
    // TODO: cache file reads
    const tmpl = Deno.readTextFileSync(path);
    const script = "`" + tmpl + "`";
    return runInContext(script, context);
  } catch (e) {
    throw new Error(`failed to render HTML template - ${path}`, { cause: e });
  }
}
