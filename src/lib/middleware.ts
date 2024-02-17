import { Config } from "../config/config.ts";
import { Contents } from "./contents.ts";
import { Resources } from "./resources.ts";

export interface Context {
  request: Request;
  response?: Response;
  srcPath: string;
  config: Config;
  contents?: Contents;
  resources?: Resources;
  remoteAddr?: Deno.NetAddr;
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

  async run(
    request: Request,
    srcPath: string,
    config: Config,
    contents?: Contents,
    resources?: Resources,
    remoteAddr?: Deno.NetAddr,
  ): Promise<Response> {
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
      { request, srcPath, config, contents, resources, remoteAddr },
      getNext,
    );
  }
}
