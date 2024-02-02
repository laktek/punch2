import { Context, NextFn } from "../lib/middleware.ts";

export default function (ctx: Context, next: NextFn): Promise<Response> {
  const { config, request } = ctx;
  const { pathname } = new URL(request.url);
  const redirect = config.redirects && config.redirects[pathname];
  if (redirect) {
    return Response.redirect(
      new URL(redirect.destination, request.url),
      redirect.permanent ? 301 : 302,
    );
  } else {
    return next()(ctx, next);
  }
}
