import { Contents } from "../../lib/contents.ts";

export async function renderHTML(
  handlebarsEnv: any,
  path: string,
  contents: Contents,
  builtins: { [key: string]: unknown },
): Promise<string> {
  try {
    const raw = await Deno.readTextFile(path);
    // contents are not escaped - developers are expected to saitize the content.
    const template = handlebarsEnv.compile(raw, { noEscape: true });

    return template(contents.proxy(builtins));
  } catch (e) {
    throw new Error(`failed to render HTML template - ${path}`, { cause: e });
  }
}
