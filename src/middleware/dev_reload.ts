import { join } from "@std/path";

import { Context, NextFn } from "../lib/middleware.ts";

export default async function (ctx: Context, next: NextFn) {
  const { request, response, config, srcPath, remoteAddr } = ctx;

  const newCtx = { ...ctx };
  if (
    response && response.body &&
    response.headers?.get("content-type")?.startsWith("text/html")
  ) {
    const clonedRes = response.clone();

    const bodyReader = clonedRes.body!.getReader();
    const { value } = await bodyReader.read();
    const decoded = new TextDecoder().decode(value);

    const script = `<script>
      const evtSource = new EventSource("/_punch/events");
      evtSource.onmessage = (event) => {
        console.log(event);
        location.reload(true);
      }
    </script>`;
    const updatedBody = decoded.replace(
      /<\/body><\/html>$/,
      `${script}</body></html>`,
    );

    const newRes = new Response(updatedBody, {
      headers: clonedRes.headers,
      status: clonedRes.status,
    });

    newCtx.response = newRes;
  }

  return next()(newCtx, next);
}
