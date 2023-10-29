import { Contents } from "../../lib/contents.ts";

export async function renderHTML(path: string, contents: Contents): string {
  const raw = await Deno.readTextFile(path);
  // render punch tags
  // render rest of the page
  // extract assets
  return raw;
}
