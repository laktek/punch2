export default function (ctx, next) {
  const { config, request } = ctx;
  const { pathname } = new URL(request.url);
  const redirect = config.redirects[pathname];
  if (redirect) {
    return Response.redirect(
      new URL(redirect.destination, request.url),
      redirect.permanent ? 301 : 302,
    );
  } else {
    return next()(ctx, next);
  }
}
