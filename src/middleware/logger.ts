import { isAbsolute, join } from "@std/path";

import { Context, NextFn } from "../lib/middleware.ts";

export default async function (ctx: Context, next: NextFn) {
  const { request, response, config, srcPath, remoteAddr } = ctx;

  // skip logging
  if (config.serve?.logging?.disabled) {
    return next()(ctx, next);
  }

  // TODO: do in a worker
  const ip = remoteAddr ? `${remoteAddr.hostname}:${remoteAddr.port}` : null;
  const event = JSON.stringify({
    date: response ? response.headers.get("date") : null,
    ip,
    method: request.method,
    url: request.url,
    userAgent: request.headers.get("user-agent"),
    status: response ? response.status : null,
    contentLength: response ? response.headers.get("content-length") : null,
  });

  const loggerPath = config.serve?.logging?.path;
  if (loggerPath) {
    const fullLoggerPath = isAbsolute(loggerPath)
      ? loggerPath
      : join(srcPath, loggerPath);
    await Deno.writeTextFile(fullLoggerPath, `${event},\n`, {
      append: true,
    });
  } else {
    console.info(event);
  }

  return next()(ctx, next);
}
