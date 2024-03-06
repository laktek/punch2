import { Context, NextFn } from "../lib/middleware.ts";
import { Contents } from "../lib/contents.ts";

function queryContents(contents: Contents, key: string, options: any) {
  const { offset, order_by, limit, ...where } = options;
  return contents.query(key, {
    limit: limit,
    where: Object.entries(where).map(([k, v]) => [k, v]),
    offset: offset,
    order_by: order_by,
  });
}

const urlPattern = new URLPattern({ pathname: "/_punch/contents/:key" });

export default async function (ctx: Context, next: NextFn) {
  const {
    srcPath,
    config,
    contents,
    resources,
    request,
    devMode,
    renderer,
    assetMap,
  } = ctx;

  // render route
  const url = new URL(request.url);

  const match = urlPattern.exec(url);
  if (match) {
    const result = queryContents(
      contents,
      match.pathname.groups.key!,
      Object.fromEntries(url.searchParams),
    );
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  } else {
    return next()(ctx, next);
  }
}
