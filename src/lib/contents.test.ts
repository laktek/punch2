import { assert, assertEquals } from "std/testing/asserts.ts";
import { join } from "std/path/mod.ts";
import { Database } from "sqlite";

import { Contents } from "./contents.ts";

Deno.test("Contents.prepare", async (t) => {
  await t.step("no contents directory", async () => {
    const db = new Database(":memory:");
    const contents = new Contents(db);
    assert(
      await contents.prepare("/path/contents") === undefined,
      "returns when contents directory does not exist",
    );
    db.close();
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

    const db = new Database(":memory:");
    const contents = new Contents(db);
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

    db.close();
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

    const db = new Database(":memory:");
    const contents = new Contents(db);
    await contents.prepare(contentsDir);

    assertEquals(
      contents.query("foo", { count: true })[0],
      1,
      "expected the record to be added under original file name",
    );

    db.close();
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

    const db = new Database(":memory:");
    const contents = new Contents(db);
    await contents.prepare(contentsDir);

    assertEquals(
      contents.query("blogs", { count: true })[0],
      3,
      "expected 3 records",
    );

    db.close();
    await Deno.remove(contentsDir, { recursive: true });
  });
});

Deno.test("Contents.insert", async (t) => {
  await t.step("valid json records", () => {
    const db = new Database(":memory:");
    const contents = new Contents(db);
    contents.insert("foo", [{ "hello": "world" }, { "hello1": "world1" }]);
    assertEquals(
      contents.query("foo", { count: true })[0],
      2,
      "expected the 2 records to inserted",
    );
    db.close();
  });

  await t.step("empty records", () => {
    const db = new Database(":memory:");
    const contents = new Contents(db);
    contents.insert("foo", []),
      assertEquals(
        contents.query("foo", { count: true })[0],
        0,
        "expected 0 records to be inserted",
      );
    db.close();
  });
});

Deno.test("Contents.query", async (t) => {
  await t.step("count records", () => {
    const db = new Database(":memory:");
    const contents = new Contents(db);
    contents.insert("foo", [{ "hello": "world" }, { "hello1": "world1" }]);
    assertEquals(
      contents.query("foo", { count: true })[0],
      2,
      "expected the 2 records to inserted",
    );
    db.close();
  });

  await t.step("limit records", () => {
    const db = new Database(":memory:");
    const contents = new Contents(db);
    contents.insert("foo", [{ "hello": "world" }, { "hello1": "world1" }, {
      "hello2": "world2",
    }]);
    assertEquals(
      contents.query("foo", { limit: 2 }),
      [{ "hello": "world" }, { "hello1": "world1" }],
      "expected to limit to 2 records",
    );
    db.close();
  });

  await t.step("offset records", () => {
    const db = new Database(":memory:");
    const contents = new Contents(db);
    contents.insert("foo", [{ "hello": "world" }, { "hello1": "world1" }, {
      "hello2": "world2",
    }]);
    assertEquals(
      contents.query("foo", { limit: 2, offset: 1 }),
      [{ "hello1": "world1" }, {
        "hello2": "world2",
      }],
      "expected to limit to 2 records",
    );
    db.close();
  });

  await t.step("sort records", () => {
    const db = new Database(":memory:");
    const contents = new Contents(db);
    contents.insert("animals", [
      { "name": "Dog", "legs": 4 },
      { "name": "Cat", "legs": 4 },
      { "name": "Bird", "legs": 2, beak: true },
      { "name": "Snake", "legs": 0 },
      { "name": "Spider", "legs": 8 },
      { "name": "Kangaroo", "legs": 2 },
    ]);

    assertEquals(
      contents.query("animals", { order_by: "legs desc" }),
      [
        { "name": "Spider", "legs": 8 },
        { "name": "Dog", "legs": 4 },
        { "name": "Cat", "legs": 4 },
        { "name": "Bird", "legs": 2, beak: true },
        { "name": "Kangaroo", "legs": 2 },
        { "name": "Snake", "legs": 0 },
      ],
      "should sort by legs descending",
    );

    assertEquals(
      contents.query("animals", { order_by: "legs" }),
      [
        { "name": "Snake", "legs": 0 },
        { "name": "Bird", "legs": 2, beak: true },
        { "name": "Kangaroo", "legs": 2 },
        { "name": "Dog", "legs": 4 },
        { "name": "Cat", "legs": 4 },
        { "name": "Spider", "legs": 8 },
      ],
      "should sort by legs ascending by default",
    );

    assertEquals(
      contents.query("animals", { order_by: "beak nulls last" }),
      [
        { "name": "Bird", "legs": 2, beak: true },
        { "name": "Dog", "legs": 4 },
        { "name": "Cat", "legs": 4 },
        { "name": "Snake", "legs": 0 },
        { "name": "Spider", "legs": 8 },
        { "name": "Kangaroo", "legs": 2 },
      ],
      "support nulls sorting",
    );

    assertEquals(
      contents.query("animals", { order_by: "beak nulls first, legs desc" }),
      [
        { "name": "Spider", "legs": 8 },
        { "name": "Dog", "legs": 4 },
        { "name": "Cat", "legs": 4 },
        { "name": "Kangaroo", "legs": 2 },
        { "name": "Snake", "legs": 0 },
        { "name": "Bird", "legs": 2, beak: true },
      ],
      "support multiple ordering terms",
    );
    db.close();
  });

  await t.step("filter records", () => {
    const db = new Database(":memory:");
    const contents = new Contents(db);

    contents.insert("animals", [
      { "name": "Dog", "legs": 4 },
      { "name": "Cat", "legs": 4 },
      { "name": "Bird", "legs": 2, beak: true },
      { "name": "Snake", "legs": 0 },
      { "name": "Spider", "legs": 8 },
      { "name": "Kangaroo", "legs": 2 },
    ]);

    assertEquals(
      contents.query("animals", { where: [["name", "Spider"]] }),
      [
        { "name": "Spider", "legs": 8 },
      ],
      "should filter by single condition",
    );

    assertEquals(
      contents.query("animals", { where: [["name", "Spider"]] }),
      [
        { "name": "Spider", "legs": 8 },
      ],
      "should filter by single condition",
    );

    assertEquals(
      contents.query("animals", { where: [["legs", 2], ["beak", true]] }),
      [
        { "name": "Bird", "legs": 2, beak: true },
      ],
      "should filter by multiple conditions",
    );

    assertEquals(
      contents.query("animals", { where: [["legs_gt", 4]] }),
      [
        { "name": "Spider", "legs": 8 },
      ],
      "should filter by greater than",
    );

    assertEquals(
      contents.query("animals", { where: [["legs_gte", 4]] }),
      [
        { "name": "Dog", "legs": 4 },
        { "name": "Cat", "legs": 4 },
        { "name": "Spider", "legs": 8 },
      ],
      "should filter by greater than or equal",
    );

    assertEquals(
      contents.query("animals", { where: [["legs_lt", 4]] }),
      [
        { "name": "Bird", "legs": 2, beak: true },
        { "name": "Snake", "legs": 0 },
        { "name": "Kangaroo", "legs": 2 },
      ],
      "should filter by less than",
    );

    assertEquals(
      contents.query("animals", { where: [["legs_lte", 4]] }),
      [
        { "name": "Dog", "legs": 4 },
        { "name": "Cat", "legs": 4 },
        { "name": "Bird", "legs": 2, beak: true },
        { "name": "Snake", "legs": 0 },
        { "name": "Kangaroo", "legs": 2 },
      ],
      "should filter by less than or equal",
    );

    assertEquals(
      contents.query("animals", { where: [["legs_not", 4]] }),
      [
        { "name": "Bird", "legs": 2, beak: true },
        { "name": "Snake", "legs": 0 },
        { "name": "Spider", "legs": 8 },
        { "name": "Kangaroo", "legs": 2 },
      ],
      "should filter by less than or equal",
    );

    assertEquals(
      contents.query("animals", { where: [["name_like", "%S%"]] }),
      [
        { "name": "Snake", "legs": 0 },
        { "name": "Spider", "legs": 8 },
      ],
      "should filter by like condition",
    );

    assertEquals(
      contents.query("animals", { where: [["name_ilike", "%s%"]] }),
      [
        { "name": "Snake", "legs": 0 },
        { "name": "Spider", "legs": 8 },
      ],
      "should filter by ilike condition (case insensitive match)",
    );
    db.close();
  });

  await t.step("return all records", () => {
    const db = new Database(":memory:");
    const contents = new Contents(db);
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
    db.close();
  });
});

Deno.test("Contents.proxy", async (t) => {
  await t.step("handles temp properties", () => {
    const db = new Database(":memory:");
    const contents = new Contents(db);
    contents.insert("foo", [{ "hello": "world" }, { "hello1": "world1" }]);
    const obj: any = contents.proxy({ "bar": "baz" });

    assertEquals(
      obj.bar,
      "baz",
      "expected proxy to match temp properties",
    );
    db.close();
  });

  await t.step("proxies to query", () => {
    const db = new Database(":memory:");
    const contents = new Contents(db);
    contents.insert("foo", [{ "hello": "world" }, { "hello1": "world1" }]);
    const obj: any = contents.proxy();

    assertEquals(
      obj.foo[0].hello,
      "world",
      "expected to match proxied value",
    );

    assertEquals(
      obj.foo.length,
      2,
      "expected to return all records for the key",
    );

    contents.insert("bar", [{ "title": "baz" }]);
    assertEquals(
      obj.bar.title,
      "baz",
      "expected to return single record",
    );

    db.close();
  });
});
