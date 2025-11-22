import { Context, NextFn } from "../lib/middleware.ts";

export default async function (ctx: Context, next: NextFn): Promise<Response> {
  const { config, request } = ctx;
  const { pathname } = new URL(request.url);
  const newCtx = { ...ctx };

  if (config.redirects) {
    // First try exact match
    const redirect = config.redirects[pathname];
    if (redirect) {
      newCtx.response = Response.redirect(
        new URL(redirect.destination, request.url),
        redirect.permanent ? 301 : 302,
      );
      return next()(newCtx, next);
    }

    // Then try wildcard matches (e.g., foo/* matches foo/bar, foo/baz, etc.)
    for (const [pattern, redirect] of Object.entries(config.redirects)) {
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -1); // Remove '*', keep the '/'
        if (pathname.startsWith(prefix)) {
          const suffix = pathname.slice(prefix.length);
          const destination = redirect.destination.endsWith('/')
            ? redirect.destination + suffix
            : redirect.destination + '/' + suffix;
          newCtx.response = Response.redirect(
            new URL(destination, request.url),
            redirect.permanent ? 301 : 302,
          );
          return next()(newCtx, next);
        }
      }
    }
  }

  return next()(newCtx, next);
}
