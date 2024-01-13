export default async function (ctx, next) {
  const { request, response, config, remoteAddr } = ctx;

  // TODO: use config to disable logging
  // TODO: use config to get path to write logs
  // TODO: do in a worker
  const useUtc = true;
  const ip = remoteAddr ? `${remoteAddr.hostname}:${remoteAddr.port}` : null;
  console.info(
    JSON.stringify({
      date: response ? response.headers.get("date") : null,
      ip,
      method: request.method,
      url: request.url,
      userAgent: request.headers.get("user-agent"),
      status: response ? response.status : null,
      contentLength: response ? response.headers.get("content-length") : null,
    }),
  );

  return next()(ctx, next);
}
