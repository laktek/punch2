import { calculate as calculateEtag } from "std/http/mod.ts";

function isAssetPath(pathname) {
  const assetPaths = ["/js", "/css"];
  return assetPaths.some((p) => pathname.startsWith(p));
}

export default async function (ctx, next) {
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
  const bodyReader = clonedRes.body.getReader();
  const { value } = await bodyReader.read();
  const etag = await calculateEtag(value);
  response.headers.set("Etag", etag);

  const newCtx = { ...ctx, response };
  return next()(newCtx, next);
}
