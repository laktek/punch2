import { assert, assertEquals } from "std/testing/asserts.ts";
import { join } from "std/path/mod.ts";
import { stringify as yamlStringify } from "std/yaml/mod.ts";
import { stringify as tomlStringify } from "std/toml/mod.ts";
import { stringify as csvStringify } from "std/csv/mod.ts";

import {
  parseCSVFile,
  parseJSONFile,
  parseMarkdownFile,
  parseTOMLFile,
  parseYAMLFile,
} from "./content_parsers.ts";

Deno.test("parseJSONFile", async (t) => {
  const contentsDir = await Deno.makeTempDir();

  await t.step("file with array of records", async () => {
    const records = [
      { "title": "foo", "content": "foo123" },
      { "title": "bar", "content": "bar123" },
    ];
    const path = join(contentsDir, "array.json");
    await Deno.writeTextFile(path, JSON.stringify(records));

    const results = await parseJSONFile(path);
    assertEquals(results, records, "expected array of records");
  });

  await t.step("file with single record", async () => {
    const record = { "title": "foo", "content": "foo123" };
    const path = join(contentsDir, "single.json");
    await Deno.writeTextFile(path, JSON.stringify(record));

    const results = await parseJSONFile(path);
    assertEquals(results, [record], "expected array with the record");
  });

  await Deno.remove(contentsDir, { recursive: true });
});

Deno.test("parseYAMLFile", async (t) => {
  const contentsDir = await Deno.makeTempDir();

  await t.step("file with single record", async () => {
    const record = { "title": "foo", "content": "foo123" };
    const path = join(contentsDir, "single.yaml");
    await Deno.writeTextFile(path, yamlStringify(record));

    const results = await parseYAMLFile(path);
    assertEquals(results, [record], "expected array with the record");
  });

  await Deno.remove(contentsDir, { recursive: true });
});

Deno.test("parseTOMLFile", async (t) => {
  const contentsDir = await Deno.makeTempDir();

  await t.step("file with single record", async () => {
    const record = { "title": "foo", "content": "foo123" };
    const path = join(contentsDir, "single.yaml");
    await Deno.writeTextFile(path, yamlStringify(record));

    const results = await parseYAMLFile(path);
    assertEquals(results, [record], "expected array with the record");
  });

  await Deno.remove(contentsDir, { recursive: true });
});

Deno.test("parseCSVFile", async (t) => {
  const contentsDir = await Deno.makeTempDir();

  await t.step("file with array of records", async () => {
    const records = [
      { "field1": "foo", "field2": "foo123" },
      { "field1": "bar", "field2": "bar123" },
    ];
    const path = join(contentsDir, "array.csv");
    await Deno.writeTextFile(
      path,
      csvStringify([
        Object.keys(records[0]) as unknown[],
        ...records.map((r) => [...Object.values(r)]),
      ]),
    );

    const results = await parseCSVFile(path);
    assertEquals(results, records, "expected array of records");
  });

  await Deno.remove(contentsDir, { recursive: true });
});

Deno.test("parseMarkdownFile", async (t) => {
  const contentsDir = await Deno.makeTempDir();

  await t.step("file with front-matter and markdown content", async () => {
    const path = join(contentsDir, "array.csv");
    await Deno.writeTextFile(
      path,
      `---\ntitle: Sample Blog\nauthor: John Doe\n---\nThis is a **sample** blog post with a [link](https://www.example.com)`,
    );

    const expected = [{
      title: "Sample Blog",
      author: "John Doe",
      x_punch_content:
        "This is a **sample** blog post with a [link](https://www.example.com)",
      x_punch_content_type: "markdown",
    }];
    const results = await parseMarkdownFile(path);
    assertEquals(
      results,
      expected,
      "parsed markdown file didn't match with expected result",
    );
  });

  await Deno.remove(contentsDir, { recursive: true });
});
