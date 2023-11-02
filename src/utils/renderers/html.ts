import { Contents } from "../../lib/contents.ts";

export async function renderHTML(
  handlebarsEnv: any,
  path: string,
  contents: Contents,
): Promise<string> {
  const raw = await Deno.readTextFile(path);
  // contents are not escaped, since site owners control the content.
  const template = handlebarsEnv.compile(raw, { noEscape: true });

  // render rest of the page
  // extract assets

  return template(contents.proxy());
}
