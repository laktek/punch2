import { Contents } from "../../lib/contents.ts";

export async function renderHTML(
  handlebarsEnv: any,
  path: string,
  contents: Contents,
): Promise<string> {
  try {
    const raw = await Deno.readTextFile(path);
    // contents are not escaped, since site owners control the content.
    const template = handlebarsEnv.compile(raw, { noEscape: true });

    return template(contents.proxy());
    // extract assets
  } catch (e) {
    throw new Error(`failed to render HTML template - ${path}`, { cause: e });
  }
}
