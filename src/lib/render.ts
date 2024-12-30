import { basename, extname, join, relative } from "@std/path";
import { exists, walk } from "@std/fs";
import { escape, unescape } from "@std/html";
import { createContext, Script } from "node:vm";

import { Contents } from "./contents.ts";
import { Config } from "../config/config.ts";
import { findResource, getRouteParams, ResourceType } from "../utils/routes.ts";
import { NotFoundError, renderHTML } from "../utils/renderers/html.ts";
import {
  getBrowserTargets,
  getTailwindConfig,
  renderCSS,
  Targets,
} from "../utils/renderers/css.ts";
import { getTsConfig, renderJS } from "../utils/renderers/js.ts";
import { Result as ImageResult } from "../utils/renderers/image.ts";
import { renderMedia } from "../utils/renderers/media.ts";
import { RenderableDocument } from "../utils/dom.ts";
import { commonSkipPaths } from "../utils/paths.ts";

export interface Context {
  srcPath: string;
  config: Config;
  contents: Contents;
  devMode: boolean;
}

export interface Output {
  route: string;
  resourceType?: ResourceType;
  content?: RenderableDocument | Uint8Array;
  metadata?: ImageResult["metadata"];
  hash?: string;
  errorStatus?: number;
  errorMessage?: string;
}

export interface RenderOptions {
  usedBy?: RenderableDocument[];
}

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

interface WorkerMsg {
  [prop: string]: string | number | object | boolean | Uint8Array | null;
}

class WorkerPool {
  #workers: Worker[];
  #current: number;
  #pendingJobs: Map<
    string,
    { resolve: (result: any) => void; reject: (reason: Error) => void }
  >;

  constructor(src: string, workerCount: number) {
    this.#workers = [];
    this.#pendingJobs = new Map();
    this.#current = 0;

    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(
        import.meta.resolve(src),
        {
          type: "module",
        },
      );
      worker.onmessage = (e) => {
        const { key, result, error } = e.data;
        const promise = this.#pendingJobs.get(key);
        if (promise) {
          error ? promise.reject(error) : promise.resolve(result);
          this.#pendingJobs.delete(key);
        }
      };
      this.#workers.push(worker);
    }
  }

  terminateAll() {
    this.#workers.forEach((worker) => worker.terminate());
  }

  #next(): number {
    const nextWorker = this.#current;
    this.#current = (this.#current + 1) %
      this.#workers.length;
    return nextWorker;
  }

  bootstrap(msg: WorkerMsg): Promise<unknown[]> {
    msg.bootstrap = true;

    return Promise.all(this.#workers.map((worker, i) => {
      const key = `bootstrap-${i}`;
      worker.postMessage({ key, msg });
      return new Promise((resolve, reject) => {
        this.#pendingJobs.set(key, { resolve, reject });
      });
    }));
  }

  process(key: string, msg?: WorkerMsg): Promise<any> {
    const worker = this.#workers[this.#next()];
    worker.postMessage({ key, msg });
    return new Promise((resolve, reject) => {
      this.#pendingJobs.set(key, { resolve, reject });
    });
  }
}

export class Renderer {
  #htmlTemplateCache: Map<string, Promise<Script>>;
  #partialsCache: Map<string, string>;
  #browserTargets?: Targets;

  #imageWorkerPool: WorkerPool;
  #htmlWorkerPool: WorkerPool;

  #contentsDb: Uint8Array | null;

  context: Context;

  constructor(context: Context) {
    this.context = context;
    this.#htmlTemplateCache = new Map();
    this.#partialsCache = new Map();

    const workerCount = context.devMode
      ? 1
      : Math.max(navigator.hardwareConcurrency - 1, 1);
    this.#imageWorkerPool = new WorkerPool(
      "../utils/workers/image_worker.ts",
      workerCount,
    );
    this.#htmlWorkerPool = new WorkerPool(
      "../utils/workers/html_worker.ts",
      workerCount,
    );
    this.#contentsDb = null;
  }

  static async init(context: Context) {
    const { srcPath, config, contents } = context;

    const renderer = new Renderer(context);
    await renderer.#cachePartials();

    await renderer.#htmlWorkerPool.bootstrap({
      srcPath,
      config,
      contentsDb: contents.serialize(),
      partialsCache: renderer.#partialsCache,
    });

    renderer.#browserTargets = getBrowserTargets(
      config.assets?.css?.browserTargets,
    );
    return renderer;
  }

  async refresh() {
    this.#htmlTemplateCache = new Map();
    await this.#cachePartials();
  }

  complete() {
    this.#imageWorkerPool.terminateAll();
    this.#htmlWorkerPool.terminateAll();
  }

  async #cachePartials() {
    const { srcPath, config } = this.context;

    const partialsPath = join(srcPath, config.dirs!.partials!);
    if (!(await exists(partialsPath))) {
      return;
    }

    // walk partials directory
    // TODO: add support for symlinks in partials directory
    for await (
      const entry of walk(partialsPath, { maxDepth: 1, skip: commonSkipPaths })
    ) {
      if (entry.isFile) {
        const tmpl = await Deno.readTextFile(entry.path);
        const ext = extname(entry.name);
        const name = basename(entry.name, ext);
        this.#partialsCache.set(name, tmpl);
      }
    }
  }

  async render(route: string, opts?: RenderOptions): Promise<Output> {
    const { srcPath, config, contents, devMode } = this.context;

    const resource = await findResource(srcPath, config, route);
    if (!resource) {
      return {
        route: route,
        errorStatus: 404,
        errorMessage: "not found",
      };
    }

    const { path, resourceType } = resource;

    // refresh contents DB before a request
    if (
      devMode && ([ResourceType.HTML, ResourceType.XML].includes(resourceType))
    ) {
      await this.#htmlWorkerPool.bootstrap({
        srcPath,
        config,
        contentsDb: contents.serialize(),
        partialsCache: this.#partialsCache,
      });
    }

    const encoder = new TextEncoder();

    if (resourceType === ResourceType.HTML) {
      const content = await this.#htmlWorkerPool.process(
        route,
        {
          devMode,
          templatePath: path,
          route,
        },
      );

      if (!content) {
        return {
          route: route,
          errorStatus: 404,
          errorMessage: "not found",
        };
      }

      // parse rendered HTML
      const doc = new RenderableDocument(content);

      let outputRoute = route;
      const ext = extname(route);
      if (ext === "") {
        outputRoute = join(route, "index.html");
      }

      return {
        route: outputRoute,
        content: doc,
        resourceType,
      };
    } else if (resourceType === ResourceType.TXT) {
      const content = await this.#htmlWorkerPool.process(
        route,
        {
          devMode,
          templatePath: path,
          route,
        },
      );

      if (!content) {
        return {
          route,
          errorStatus: 404,
          errorMessage: "not found",
        };
      }

      return {
        route,
        content: encoder.encode(content),
        resourceType,
      };
    } else if (resourceType === ResourceType.XML) {
      const content = await this.#htmlWorkerPool.process(
        route,
        {
          devMode,
          templatePath: path,
          route,
        },
      );

      if (!content) {
        return {
          route: route,
          errorStatus: 404,
          errorMessage: "not found",
        };
      }

      let outputRoute = route;
      const ext = extname(route);
      if (ext === "") {
        outputRoute = join(route, "index.xml");
      }

      return {
        route: outputRoute,
        content: encoder.encode(content),
        resourceType,
      };
    } else if (resourceType === ResourceType.CSS) {
      const tailwindConfig = await getTailwindConfig(
        config.assets?.css?.tailwind,
        srcPath,
      );
      const content = await renderCSS(
        path,
        this.#browserTargets,
        opts?.usedBy,
        tailwindConfig,
      );
      return {
        route,
        content: encoder.encode(content),
        resourceType,
      };
    } else if (resourceType === ResourceType.JS) {
      const tsConfig = await getTsConfig(
        config.assets?.js?.tsconfig,
        srcPath,
      );
      const result = await renderJS(
        path,
        join(srcPath, config.dirs!.js!),
        tsConfig,
      );
      return {
        route,
        content: encoder.encode(result.outputFiles[0].text),
        resourceType,
      };
    } else if (resourceType === ResourceType.IMAGE) {
      const { content, metadata } = await this.#imageWorkerPool.process(path);
      return {
        route,
        content,
        metadata,
        resourceType,
      };
    } else if (
      resourceType === ResourceType.AUDIO || resourceType === ResourceType.VIDEO
    ) {
      const { content } = await renderMedia(path);
      return {
        route,
        content,
        resourceType,
      };
    } else {
      return {
        route: route,
        errorStatus: 400,
        errorMessage: "not supported yet",
      };
    }
  }
}
