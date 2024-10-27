import { type Context, Script } from "node:vm";

export class NotFoundError extends Error {
  constructor() {
    super("Punch: content not found");
    this.name = "NotFoundError";
  }
}

export function renderHTML(
  tmpl: Script,
  context: Context,
): string | null {
  try {
    return tmpl.runInContext(context);
  } catch (e) {
    if (e instanceof NotFoundError) {
      return null;
    }
    throw e;
  }
}
