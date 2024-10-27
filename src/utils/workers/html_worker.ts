import { basename, extname, join, relative, resolve } from "@std/path";
import { exists, walk } from "@std/fs";
import { createContext, Script } from "node:vm";
import { DB } from "sqlite";

import { Contents } from "../../lib/contents.ts";
import { Config } from "../../config/config.ts";
import { NotFoundError, renderHTML } from "../renderers/html.ts";
import { getRouteParams } from "../routes.ts";
import { commonSkipPaths } from "../paths.ts";

interface BootstrapMessage {
  bootstrap: boolean;
  srcPath: string;
  config: Config;
  contentsDb: Uint8Array;
  partialsCache: Map<string, string>;
}

interface InputMessage {
  bootstrap?: boolean;
  devMode: boolean;
  path: string;
  templatePath: string;
  route: string;
}

let srcPath: null | string = null;
let config: null | Config = null;
let contents: null | Contents = null;
let partialsCache: null | Map<string, string> = null;

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
function setupContents(data: Uint8Array) {
  const db = new DB();
  if (data.byteLength) {
    db.deserialize(data, {
      mode: "read",
    });
  }

  db.execute("pragma temp_store = memory");
  contents = new Contents(db);
}

async function getHTMLTemplate(
  path: string,
  skip_cache: boolean,
): Promise<Script> {
  if (!skip_cache) {
    const cached = htmlTemplateCache.get(path);
    if (cached) {
      return cached;
    }
  }

  const promise = (async () => {
    const tmpl = await Deno.readTextFile(path);
    return new Script("`" + tmpl + "`");
  })();

  if (!skip_cache) {
    htmlTemplateCache.set(path, promise);
  }

  return promise;
}

async function bootstrapWorker(key: string, msg: BootstrapMessage) {
  srcPath = msg.srcPath;
  config = msg.config;
  partialsCache = msg.partialsCache;

  setupContents(msg.contentsDb);

  (globalThis as any).postMessage({ key, result: undefined });
}

async function processMessage(key: string, msg: InputMessage) {
  try {
    if (!srcPath || !config || !contents || !partialsCache) {
      throw new Error(
        "worker bootstrap must be completed before sending inputs",
      );
    }

    const {
      devMode,
      route,
      templatePath,
    } = msg;

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

    // skip template cache is dev mode
    const tmpl = await getHTMLTemplate(templatePath, devMode);

    const renderHTMLContext = createContext(
      contents!.proxy({ ...builtins }),
    );

    const result = renderHTML(
      tmpl,
      renderHTMLContext,
    );

    (globalThis as any).postMessage({ key, result });
  } catch (e) {
    console.error(`Failed to render page ${key}\n${e}`);
    (globalThis as any).postMessage({ key, result: (e as Error).message });
  }
}

(globalThis as any).onmessage = async (
  e: { data: { key: string; msg: BootstrapMessage | InputMessage } },
) => {
  const { key, msg } = e.data;
  if (msg.bootstrap) {
    bootstrapWorker(key, msg as BootstrapMessage);
  } else {
    processMessage(key, msg as InputMessage);
  }
};
