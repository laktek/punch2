import { Config } from "../config/config.ts";

type Middleware = (
  req: Request,
  config: Config,
  next: NextFn,
) => Promise<Response>;
export type NextFn = () => Middleware | undefined;

export class MiddlewareChain {
  #chain: Middleware[];

  constructor() {
    this.#chain = [];
  }

  append(...middleware: Middleware[]) {
    this.#chain.push(...middleware);
  }

  prepend(...middleware: Middleware[]) {
    this.#chain.unshift(...middleware);
  }

  reset() {
    this.#chain = [];
  }

  async run(req: Request, config: Config): Promise<Response> {
    const getNext = () => {
      return this.#chain.shift();
    };

    const next = getNext();
    if (next) {
      return await next(req, config, getNext);
    } else {
      return Response.error();
    }
  }
}
