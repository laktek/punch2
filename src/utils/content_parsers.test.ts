import { assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import { stringify as yamlStringify } from "@std/yaml";
import { stringify as tomlStringify } from "@std/toml";
import { stringify as csvStringify } from "@std/csv";

import { parseFile } from "./content_parsers.ts";

Deno.test("parseJSONFile", async (t) => {
  const contentsDir = await Deno.makeTempDir();

  await t.step("file with array of records", async () => {
    const records = [
      { "title": "foo", "content": "foo123" },
      { "title": "bar", "content": "bar123" },
    ];
    const path = join(contentsDir, "array.json");
    await Deno.writeTextFile(path, JSON.stringify(records));

    const results = await parseFile(path);
    assertEquals(results?.records, records, "expected array of records");
  });

  await t.step("file with single record", async () => {
    const record = { "title": "foo", "content": "foo123" };
    const path = join(contentsDir, "single.json");
    await Deno.writeTextFile(path, JSON.stringify(record));

    const results = await parseFile(path);
    assertEquals(results?.records, [record], "expected array with the record");
  });

  await Deno.remove(contentsDir, { recursive: true });
});

Deno.test("parseYAMLFile", async (t) => {
  const contentsDir = await Deno.makeTempDir();

  await t.step("file with single record", async () => {
    const record = { "title": "foo", "content": "foo123" };
    const path = join(contentsDir, "single.yaml");
    await Deno.writeTextFile(path, yamlStringify(record));

    const results = await parseFile(path);
    assertEquals(results?.records, [record], "expected array with the record");
  });

  await Deno.remove(contentsDir, { recursive: true });
});

Deno.test("parseTOMLFile", async (t) => {
  const contentsDir = await Deno.makeTempDir();

  await t.step("file with single record", async () => {
    const record = { "title": "foo", "content": "foo123" };
    const path = join(contentsDir, "single.toml");
    await Deno.writeTextFile(path, tomlStringify(record));

    const results = await parseFile(path);
    assertEquals(results?.records, [record], "expected array with the record");
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

    const results = await parseFile(path);
    assertEquals(results?.records, records, "expected array of records");
  });

  await Deno.remove(contentsDir, { recursive: true });
});

Deno.test("parseMarkdownFile", async (t) => {
  const contentsDir = await Deno.makeTempDir();

  await t.step("file with front-matter and markdown content", async () => {
    const path = join(contentsDir, "post.md");
    await Deno.writeTextFile(
      path,
      `---\ntitle: Sample Blog\nauthor: John Doe\n---\n# Title\n## Sub Title 1\nThis is a **sample** blog post with a [link](https://www.example.com)`,
    );

    const expected = [{
      title: "Sample Blog",
      author: "John Doe",
      content:
        `<h1 id="title">Title</h1>\n<h2 id="sub-title-1">Sub Title 1</h2>\n<p>This is a <strong>sample</strong> blog post with a <a href="https://www.example.com">link</a></p>\n`,
      raw_content:
        `# Title\n## Sub Title 1\nThis is a **sample** blog post with a [link](https://www.example.com)`,
      content_type: "markdown",
      headings: [
        {
          depth: 1,
          slug: "title",
          text: "Title",
        },
        {
          depth: 2,
          slug: "sub-title-1",
          text: "Sub Title 1",
        },
      ],
    }];
    const results = await parseFile(path);
    assertEquals(
      results?.records,
      expected,
      "parsed markdown file didn't match with expected result",
    );
  });

  await t.step(".markdown content file", async () => {
    const path = join(contentsDir, "post.markdown");
    await Deno.writeTextFile(
      path,
      `---\ntitle: Sample Blog\nauthor: John Doe\n---\nThis is a **sample** blog post with a [link](https://www.example.com)`,
    );

    const expected = [{
      title: "Sample Blog",
      author: "John Doe",
      content:
        `<p>This is a <strong>sample</strong> blog post with a <a href="https://www.example.com">link</a></p>\n`,
      raw_content:
        `This is a **sample** blog post with a [link](https://www.example.com)`,
      content_type: "markdown",
      headings: [],
    }];
    const results = await parseFile(path);
    assertEquals(
      results?.records,
      expected,
      "parsed markdown file didn't match with expected result",
    );
  });

  await Deno.remove(contentsDir, { recursive: true });
});

Deno.test("parseFile", async (t) => {
  const contentsDir = await Deno.makeTempDir();

  await t.step("handle exceptions when parsing files", async () => {
    const path = join(contentsDir, "array.csv");

    assertRejects(
      async () => {
        await parseFile(path);
      },
      Error,
      "failed to parse file",
    );
  });

  await Deno.remove(contentsDir, { recursive: true });
});
