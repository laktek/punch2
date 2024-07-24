import { Contents } from "../../lib/contents.ts";
import { type Context, runInContext } from "node:vm";

export class NotFoundError extends Error {
  constructor() {
    super("Punch: content not found");
    this.name = "NotFoundError";
  }
}

export function renderHTML(
  path: string,
  context: Context,
): string | null {
  try {
    // TODO: cache file reads
    const tmpl = Deno.readTextFileSync(path);
    const script = "`" + tmpl + "`";
    return runInContext(script, context);
  } catch (e) {
    if (e instanceof NotFoundError) {
      return null;
    }
    throw new Error(`failed to render HTML template - ${path}`, { cause: e });
  }
}
