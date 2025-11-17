import { basename, extname, join, relative, resolve } from "@std/path";
import { exists, walk } from "@std/fs";
import { escape as escapeHTML, unescape as unescapeHTML } from "@std/html";
import { createContext, Script } from "node:vm";
import { DB } from "sqlite";
import * as esbuild from "esbuild";

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
let defaultBuiltins = {
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
  escapeHTML,
  unescapeHTML,
};
let helpers: { [name: string]: unknown } = {};

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

function getHelperNameFromPath(
  entryPath: string,
  helpersDir: string,
): string | null {
  const relativePath = relative(helpersDir, entryPath);
  const pathParts = relativePath.split("/");

  if (pathParts.length === 1) {
    // Top level file - check if it's a valid helper file
    if (
      extname(entryPath) === ".js" || extname(entryPath) === ".mjs" ||
      extname(entryPath) === ".ts" || extname(entryPath) === ".mts"
    ) {
      return basename(entryPath, extname(entryPath));
    }
  } else if (pathParts.length === 2) {
    // File in subdirectory - check if it's index.js
    const fileName = basename(entryPath);
    if (
      fileName === "index.js" || fileName === "index.mjs" ||
      fileName === "index.ts" || fileName === "index.mts"
    ) {
      return pathParts[0]; // directory name
    }
  }

  return null;
}

async function setupHelpers(): Promise<{ [name: string]: unknown }> {
  if (!config?.dirs?.helpers || !srcPath) {
    return {};
  }

  const helpersDir = resolve(srcPath, config.dirs.helpers);

  // Check if helpers directory exists
  if (!await exists(helpersDir)) {
    return {};
  }

  const context = createContext(defaultBuiltins);
  const entryPoints: string[] = [];
  const entryPointToHelperName = new Map<string, string>();

  // Walk through files in helpersDir (traverse up to 1 level for directories)
  for await (
    const entry of walk(helpersDir, {
      maxDepth: 2,
      skip: commonSkipPaths,
      includeDirs: false,
    })
  ) {
    const helperName = getHelperNameFromPath(entry.path, helpersDir);
    if (helperName) {
      entryPoints.push(entry.path);
      entryPointToHelperName.set(entry.path, helperName);
    }
  }

  if (entryPoints.length === 0) {
    return {};
  }

  // Build each helper individually to maintain entry point mapping
  const helperResults: { [name: string]: unknown } = {};
  for await (const entryPoint of entryPoints) {
    const helperName = entryPointToHelperName.get(entryPoint);
    if (!helperName) continue;

    try {
      const result = await esbuild.build({
        entryPoints: [entryPoint],
        bundle: true,
        format: "iife",
        write: false,
        globalName: "HelperModule",
      });

      if (result.outputFiles && result.outputFiles.length > 0) {
        const output = result.outputFiles[0];

        // Create and execute the script in the context
        const script = new Script(output.text);
        script.runInContext(context);

        // Extract the exported function/object from the context
        const helperModule = (context as any).HelperModule;
        const helperFn = helperModule?.default ?? helperModule;

        helperResults[helperName] = helperFn;
      }
    } catch (error) {
      console.error(`Failed to process helper ${helperName}:`, error);
    }
  }

  // Stop esbuild
  esbuild.stop();

  return helperResults;
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

  helpers = await setupHelpers();

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
      ...helpers,
      ...defaultBuiltins,
      Punch: {
        devMode,
        notFound: () => {
          throw new NotFoundError();
        },
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
      },
    };

    // skip template cache is dev mode
    const tmpl = await getHTMLTemplate(templatePath, devMode);

    const renderHTMLContext = createContext(
      contents!.proxy({ ...builtins, globalThis: builtins }),
    );

    const result = renderHTML(
      tmpl,
      renderHTMLContext,
    );

    (globalThis as any).postMessage({ key, result });
  } catch (error) {
    // TODO: investigate bug in Deno 2.0.3 where Error cannot be posted before `console.error` it.
    console.error(error);
    (globalThis as any).postMessage({
      key,
      error,
    });
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
