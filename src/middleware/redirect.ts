import { Context, NextFn } from "../lib/middleware.ts";

export default async function (ctx: Context, next: NextFn): Promise<Response> {
  const { config, request } = ctx;
  const { pathname } = new URL(request.url);
  const newCtx = { ...ctx };

  // TODO: support wildcard path names
  const redirect = config.redirects && config.redirects[pathname];
  if (redirect) {
    newCtx.response = return Response.redirect(
      new URL(redirect.destination, request.url),
      redirect.permanent ? 301 : 302,
    );
  }

  return next()(newCtx, next);
}
