import { Context, NextFn } from "../lib/middleware.ts";

export default async function (ctx: Context, next: NextFn) {
  if (!ctx.response) {
    return next()(ctx, next);
  }
  const { response } = ctx;
  response.headers.set("Server", "Punch");
  const date = ctx.config.serve?.timestamp === "local"
    ? new Date().toString()
    : new Date().toUTCString();
  response.headers.set("Date", date);

  const newCtx = { ...ctx, response };
  return next()(ctx, next);
}
