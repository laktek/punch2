import { Config } from "../config/config.ts";
import { Contents } from "./contents.ts";
import { Resources } from "./resources.ts";
import { AssetMap } from "../lib/asset_map.ts";
import { Renderer } from "../lib/render.ts";

export interface Context {
  request: Request;
  srcPath: string;
  config: Config;
  contents: Contents;
  resources: Resources;
  renderer?: Renderer;
  assetMap: AssetMap;
  remoteAddr?: Deno.Addr;
  devMode?: boolean;

  response?: Response;
}

export type Middleware = (
  ctx: Context,
  next: NextFn,
) => Promise<Response>;
export type NextFn = () => Middleware;

export class MiddlewareChain {
  #chain: Middleware[];

  constructor(...middleware: Middleware[]) {
    this.#chain = [...middleware];
  }

  async run(ctxInit: Context): Promise<Response> {
    const getNext = (): Middleware => {
      if (this.#chain.length) {
        return this.#chain.shift() as Middleware;
      } else {
        // return a default finalize middleware
        return async (ctx: Context, _next: NextFn) => {
          if (ctx.response) {
            return ctx.response;
          } else {
            return Response.error();
          }
        };
      }
    };

    const next = getNext();
    return await next(
      ctxInit,
      getNext,
    );
  }
}
