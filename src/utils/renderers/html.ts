import { type Context, runInContext } from "node:vm";

export class NotFoundError extends Error {
  constructor() {
    super("Punch: content not found");
    this.name = "NotFoundError";
  }
}

export function renderHTML(
  tmpl: string,
  context: Context,
): string | null {
  try {
    const script = "`" + tmpl + "`";
    return runInContext(script, context);
  } catch (e) {
    if (e instanceof NotFoundError) {
      return null;
    }
    throw new Error(`failed to render HTML template`, { cause: e });
  }
}
