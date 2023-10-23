import { assert, assertRejects } from "std/testing/asserts.ts";

import { Contents } from "./contents.ts";

Deno.test("Contents.prepare", async (t) => {
  await t.step("no contents directory", async () => {
    const contents = new Contents({});
    assert(
      await contents.prepare("/path/contents") === undefined,
      "returns when contents directory does not exist",
    );
  });

  await t.step("reads top-level json file", async () => {});

  await t.step("reads top-level md file", async () => {});

  await t.step("reads a directory with md files", async () => {});

  await t.step("ignore sub-directories within directory", async () => {});
});
