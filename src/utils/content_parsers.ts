import { basename, extname } from "@std/path";
import { parse as yamlParse } from "@std/yaml";
import { parse as tomlParse } from "@std/toml";
import { parse as csvParse } from "@std/csv";
import { walk } from "@std/fs";
import { resolve } from "@std/path";
import matter from "gray-matter";
import { marked } from "marked";

import { commonSkipPaths } from "./paths.ts";
import CustomRenderer from "./markdown.ts";

interface Result {
  key: string;
  records: unknown[];
}

export async function parseJSONFile(path: string): Promise<unknown[]> {
  const data = JSON.parse(await Deno.readTextFile(path));
  if (Array.isArray(data)) {
    return data;
  } else {
    return [data];
  }
}

export async function parseYAMLFile(
  path: string,
): Promise<unknown[]> {
  const data = yamlParse(await Deno.readTextFile(path));
  return [data];
}

export async function parseTOMLFile(
  path: string,
): Promise<unknown[]> {
  const data = tomlParse(await Deno.readTextFile(path));
  return [data];
}

export async function parseCSVFile(
  path: string,
): Promise<unknown[]> {
  const data = csvParse(await Deno.readTextFile(path), { skipFirstRow: true });
  return data;
}

export async function parseMarkdownFile(path: string): Promise<unknown[]> {
  const { data, content } = matter(await Deno.readTextFile(path));
  const renderer = new CustomRenderer();
  const htmlContent = await marked.parse(
    content.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, ""),
    { async: true, gfm: true, renderer },
  );
  return [
    {
      ...data,
      content: htmlContent,
      raw_content: content,
      content_type: "markdown",
      headings: renderer.getHeadings(),
    },
  ];
}

export function getKey(basename: string): string {
  return basename.toLowerCase().replace(/^[^a-z0-9-_]+/, "");
}

export async function parseFile(path: string): Promise<Result | null> {
  try {
    const ext = extname(path);
    const key = getKey(basename(path, ext));
    let records = null;
    if (ext === ".json") {
      records = await parseJSONFile(path);
    } else if (ext === ".yaml") {
      records = await parseYAMLFile(path);
    } else if (ext === ".toml") {
      records = await parseTOMLFile(path);
    } else if (ext === ".csv") {
      records = await parseCSVFile(path);
    } else if ([".md", ".markdown"].includes(ext)) {
      records = await parseMarkdownFile(path);
    } else {
      console.error(`unsupported content file: ${path}`);
    }

    if (records === null) {
      return null;
    }

    return { key, records };
  } catch (e) {
    throw new Error(`failed to parse file ${path}`, { cause: e });
  }
}

export async function parseDir(path: string): Promise<Result | null> {
  const dirKey = getKey(basename(path));
  const allRecords = [];

  for await (
    const entry of walk(path, { maxDepth: 1, skip: commonSkipPaths })
  ) {
    // only files and symlinks are parsed
    let filePath = null;
    if (entry.isFile) {
      filePath = entry.path;
    } else if (entry.isSymlink) {
      const originalPath = resolve(
        entry.path,
        "../",
        Deno.readLinkSync(entry.path),
      );
      filePath = originalPath;
    }

    // skip directories
    if (!filePath) {
      continue;
    }

    const result = await parseFile(filePath);
    if (result) {
      const { records, key } = result;
      const recordsWithSlug = records.map((r: any) => ({
        ...r,
        key,
        slug: key,
      }));
      allRecords.push(...recordsWithSlug);
    }
  }

  return { key: dirKey, records: allRecords };
}
