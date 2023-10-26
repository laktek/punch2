import { assert, assertEquals, assertRejects } from "std/testing/asserts.ts";

import { Contents } from "./contents.ts";

Deno.test("Contents.prepare", async (t) => {
  const contents = new Contents();
  await t.step("no contents directory", async () => {
    assert(
      await contents.prepare("/path/contents") === undefined,
      "returns when contents directory does not exist",
    );
  });
  contents.close();
});

Deno.test("Contents.insert", async (t) => {
  const contents = new Contents();
  await t.step("valid json records", async () => {
    contents.insert("foo", [{ "hello": "world" }]),
      assertEquals(
        contents.query("foo", { count: true })[0][0],
        1,
        "expected the records to be inserted",
      );
  });
  contents.close();
});
