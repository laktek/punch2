import { Context, NextFn } from "../lib/middleware.ts";

export default async function (ctx: Context, next: NextFn): Promise<Response> {
  const { config, request } = ctx;
  const { pathname } = new URL(request.url);
  const newCtx = { ...ctx };

  if (config.redirects) {
    // First try exact match
    const redirect = config.redirects[pathname];
    if (redirect) {
      const location = new URL(redirect.destination, request.url).toString();
      newCtx.response = new Response(null, {
        status: redirect.permanent ? 301 : 302,
        headers: { Location: location },
      });
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
          const location = new URL(destination, request.url).toString();
          newCtx.response = new Response(null, {
            status: redirect.permanent ? 301 : 302,
            headers: { Location: location },
          });
          return next()(newCtx, next);
        }
      }
    }
  }

  return next()(newCtx, next);
}
