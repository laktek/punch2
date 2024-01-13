export default async function (ctx, next) {
  if (!ctx.response) {
    return next()(ctx, next);
  }
  const { response } = ctx;
  response.headers.set("Server", "Punch");
  // TODO: timestamp from config (utc / local)
  response.headers.set("Date", new Date().toUTCString());

  const newCtx = { ...ctx, response };
  return next()(ctx, next);
}
