import { Config } from "../config/config.ts";

export interface Context {
  request: Request;
  response?: Response;
  config: Config;
  remoteAddr?: Deno.NetAddr;
}

type Middleware = (
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
    config: Config,
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
    return await next({ request, config, remoteAddr }, getNext);
  }
}
