import { Contents } from "../../lib/contents.ts";
import Handlebars from "handlebars";

export async function renderHTML(path: string, contents: Contents): string {
  const raw = await Deno.readTextFile(path);
  const template = Handlebars.compile(raw);
  // render punch tags
  // render rest of the page
  // extract assets
  const contentProxy = new Proxy({}, {
    getOwnPropertyDescriptor(target: unknown, prop: string) {
      const results = contents.query(prop);
      if (results.length === 1) {
        return { configurable: true, enumerable: true, value: results[0] };
      } else {
        return { configurable: true, enumerable: true, value: results };
      }
    },

    get(target: unknown, prop: string) {
      const results = contents.query(prop);
      if (results.length === 1) {
        return results[0];
      } else {
        return results;
      }
    },
  });
  return template(contentProxy);
}
