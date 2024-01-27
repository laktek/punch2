import { calculate as calculateEtag } from "std/http/mod.ts";

import { Context, NextFn } from "../lib/middleware.ts";

function isAssetPath(pathname: string) {
  const assetPaths = ["/js", "/css", "/images", "/media"];
  return assetPaths.some((p) => pathname.startsWith(p));
}

export default async function (ctx: Context, next: NextFn) {
  if (!ctx.response) {
    return next()(ctx, next);
  }

  const { request, response } = ctx;
  const { pathname } = new URL(request.url);

  let cacheHeaderValue = "public,max-age=0,must-revalidate";
  if (isAssetPath(pathname)) {
    cacheHeaderValue = "public,max-age=31536000,immutable";
  }
  response.headers.set("Cache-Control", cacheHeaderValue);

  // set etag
  const clonedRes = response.clone();
  if (clonedRes.body) {
    const bodyReader = clonedRes.body.getReader();
    const { value } = await bodyReader.read();
    const etag = await calculateEtag(value || "");
    if (etag) {
      response.headers.set("Etag", etag);
    }
  }

  const newCtx = { ...ctx, response };
  return next()(newCtx, next);
}
