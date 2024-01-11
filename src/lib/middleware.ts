type Middleware = (req: Request, next: NextFn) => Promise<Response>;
export type NextFn = () => Middleware | undefined;

export class MiddlewareChain {
  #chain: Middleware[];

  constructor() {
    this.#chain = [];
  }

  append(...middlewares: Middleware[]) {
    this.#chain.push(...middlewares);
  }

  prepend(...middlewares: Middleware[]) {
    this.#chain.unshift(...middlewares);
  }

  reset() {
    this.#chain = [];
  }

  async run(req: Request): Promise<Response> {
    const getNext = () => {
      return this.#chain.shift();
    };

    const next = getNext();
    if (next) {
      return await next(req, getNext);
    } else {
      return Response.error();
    }
  }
}
