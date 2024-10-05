import { basename, extname, join, relative, resolve } from "@std/path";
import { exists, walk } from "@std/fs";
import { createContext, Script } from "node:vm";
import { DB } from "sqlite";

import { Contents } from "../../lib/contents.ts";
import { Config } from "../../config/config.ts";
import { NotFoundError, renderHTML } from "../renderers/html.ts";
import { getRouteParams } from "../routes.ts";
import { commonSkipPaths } from "../paths.ts";

interface InputMessage {
  srcPath: string;
  config: Config;
  devMode: boolean;

  path: string;
  templatePath: string;
  route: string;
  partialsCache: Map<string, string>;
}

let contents: null | Contents = null;

const htmlTemplateCache = new Map();

function queryContents(contents: Contents, params: any) {
  const { from, offset, order_by, limit, count, sql, ...where } = params;
  const results = contents.query(from, {
    limit,
    where: Object.entries(where).map(([k, v]) => [k, v]),
    offset,
    order_by,
    count,
    sql,
  });
  return results;
}

// setup a new DB connection (this will be read-only)
function setupContents(srcPath: string, config: Config) {
  // contents are already setup
  if (contents !== null) {
    return;
  }
  const db = new DB(resolve(srcPath, config.db?.path ?? "punch.db"), {
    mode: "read",
  });
  db.execute("pragma temp_store = memory");

  contents = new Contents(db, config.db?.indexes);
}

async function getHTMLTemplate(path: string): Promise<Script> {
  const cached = htmlTemplateCache.get(path);
  if (cached) {
    return cached;
  }
  const promise = (async () => {
    const tmpl = await Deno.readTextFile(path);
    return new Script("`" + tmpl + "`");
  })();
  htmlTemplateCache.set(path, promise);
  return promise;
}

(globalThis as any).onmessage = async (e: { data: InputMessage }) => {
  const { srcPath, config, devMode, route, templatePath, partialsCache } =
    e.data;

  setupContents(srcPath, config);

  const builtins = {
    console,
    Date,
    Intl,
    JSON,
    atob,
    btoa,
    TextEncoder,
    TextDecoder,
    URL,
    URLPattern,
    URLSearchParams,
    Punch: {
      route: getRouteParams(
        route,
        relative(join(srcPath, config.dirs!.pages!), templatePath),
      ),
      one: (params: any, callback: (i: unknown) => string) => {
        const results = queryContents(contents!, {
          ...params,
          limit: 1,
        });
        return callback(results[0]);
      },
      all: (params: any, callback: (i: unknown) => string) => {
        return queryContents(contents!, params).map((result) =>
          callback(result)
        )
          .join("");
      },
      count: (params: any) => {
        return queryContents(contents!, { ...params, limit: 1, count: true });
      },
      partial: (name: string, params?: any) => {
        const tmpl = partialsCache!.get(name);
        if (!tmpl) {
          throw new Error(`partial not found. name: ${name}`);
        }
        const script = new Script("`" + tmpl + "`");
        const context = createContext({
          ...params,
          ...builtins,
          _params: { ...params },
        });
        return renderHTML(script, context);
      },
      notFound: () => {
        throw new NotFoundError();
      },
      escape,
      unescape,
      devMode,
    },
  };

  const tmpl = await getHTMLTemplate(templatePath);

  const renderHTMLContext = createContext(
    contents!.proxy({ ...builtins }),
  );

  const result = renderHTML(
    tmpl,
    renderHTMLContext,
  );

  // fixme path to id
  (globalThis as any).postMessage({ path: route, result });
};
