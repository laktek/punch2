import { assert, assertEquals, assertRejects } from "std/testing/asserts.ts";
import { join } from "std/path/mod.ts";

import { Contents } from "./contents.ts";

Deno.test("Contents.prepare", async (t) => {
  await t.step("no contents directory", async () => {
    const contents = new Contents();
    assert(
      await contents.prepare("/path/contents") === undefined,
      "returns when contents directory does not exist",
    );
    contents.close();
  });

  await t.step("a contents directory with 2 json files", async () => {
    const contentsDir = await Deno.makeTempDir();
    await Deno.writeTextFile(
      join(contentsDir, "foo.json"),
      JSON.stringify({
        "title": "foo",
        "summary":
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
      }),
    );
    await Deno.writeTextFile(
      join(contentsDir, "bar.json"),
      JSON.stringify([{
        "title": "bar1",
        "summary":
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
      }, {
        "title": "bar2",
        "summary":
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
      }]),
    );

    const contents = new Contents();
    await contents.prepare(contentsDir);

    assertEquals(
      contents.query("foo", { count: true })[0],
      1,
      "expected the 1 record",
    );

    assertEquals(
      contents.query("bar", { count: true })[0],
      2,
      "expected the 1 record",
    );

    contents.close();
    await Deno.remove(contentsDir, { recursive: true });
  });

  await t.step("a contents directory with a symlinked file", async () => {
    const rootDir = await Deno.makeTempDir();
    const contentsDir = join(rootDir, "contents");
    await Deno.mkdir(contentsDir);

    const origPath = join(rootDir, "foo.json");
    const symPath = join(contentsDir, "bar.json");
    await Deno.writeTextFile(
      origPath,
      JSON.stringify({
        "title": "foo",
        "summary":
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
      }),
    );

    await Deno.symlink(origPath, symPath);

    const contents = new Contents();
    await contents.prepare(contentsDir);

    assertEquals(
      contents.query("foo", { count: true })[0],
      1,
      "expected the record to be added under original file name",
    );

    contents.close();
    await Deno.remove(contentsDir, { recursive: true });
  });

  await t.step("a contents directory with a directory", async () => {
    const contentsDir = await Deno.makeTempDir();
    const blogsDir = join(contentsDir, "blogs");
    await Deno.mkdir(blogsDir);

    await Deno.writeTextFile(
      join(blogsDir, "foo.json"),
      JSON.stringify({
        "title": "foo",
        "summary":
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
      }),
    );
    await Deno.writeTextFile(
      join(blogsDir, "bar.json"),
      JSON.stringify([{
        "title": "bar1",
        "summary":
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
      }, {
        "title": "bar2",
        "summary":
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
      }]),
    );

    const contents = new Contents();
    await contents.prepare(contentsDir);

    assertEquals(
      contents.query("blogs", { count: true })[0],
      3,
      "expected 3 records",
    );

    contents.close();
    await Deno.remove(contentsDir, { recursive: true });
  });
});

Deno.test("Contents.insert", async (t) => {
  await t.step("valid json records", async () => {
    const contents = new Contents();
    contents.insert("foo", [{ "hello": "world" }, { "hello1": "world1" }]);
    assertEquals(
      contents.query("foo", { count: true })[0],
      2,
      "expected the 2 records to inserted",
    );
    contents.close();
  });

  await t.step("empty records", async () => {
    const contents = new Contents();
    contents.insert("foo", []),
      assertEquals(
        contents.query("foo", { count: true })[0],
        0,
        "expected 0 records to be inserted",
      );
    contents.close();
  });
});

Deno.test("Contents.query", async (t) => {
  await t.step("count records", async () => {
    const contents = new Contents();
    contents.insert("foo", [{ "hello": "world" }, { "hello1": "world1" }]);
    assertEquals(
      contents.query("foo", { count: true })[0],
      2,
      "expected the 2 records to inserted",
    );
    contents.close();
  });

  await t.step("limit records", async () => {
    const contents = new Contents();
    contents.insert("foo", [{ "hello": "world" }, { "hello1": "world1" }, {
      "hello2": "world2",
    }]);
    assertEquals(
      contents.query("foo", { limit: 2 }).length,
      2,
      "expected to limit to 2 records",
    );
    contents.close();
  });

  await t.step("return all records", async () => {
    const contents = new Contents();
    contents.insert("foo", [{ "hello": "world" }, { "hello1": "world1" }, {
      "hello2": "world2",
    }]);
    assertEquals(
      contents.query("foo"),
      [{ "hello": "world" }, { "hello1": "world1" }, {
        "hello2": "world2",
      }],
      "expected to return all records",
    );
    contents.close();
  });
});
