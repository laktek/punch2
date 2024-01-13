async function customHandler(ctx, next) {
  const response = new Response("this is a custom response");
  return next()({ ...ctx, response }, next);
}

async function addHeader(ctx, next) {
  const { response } = ctx;
  response.headers.set("x-generator", "custom");
  return next()({ ...ctx, response }, next);
}

export default function () {
  return [customHandler, addHeader];
}
