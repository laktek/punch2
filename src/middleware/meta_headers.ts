import { Context, NextFn } from "../lib/middleware.ts";

export default async function (ctx: Context, next: NextFn) {
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
