import { Config } from "../config/config.ts";

export interface Context {
  request: Request;
  response?: Response;
  config: Config;
}

type Middleware = (
  ctx: Context,
  next: NextFn,
) => Promise<Response>;
export type NextFn = () => Middleware | undefined;

export class MiddlewareChain {
  #chain: Middleware[];

  constructor(...middleware: Middleware[]) {
    this.#chain = [...middleware];
  }

  async run(request: Request, config: Config): Promise<Response> {
    const getNext = () => {
      return this.#chain.shift();
    };

    const next = getNext();
    if (next) {
      return await next({ request, config }, getNext);
    } else {
      return Response.error();
    }
  }
}
