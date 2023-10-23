import { basename, extname, join } from "std/path/mod.ts";
import { parse as yamlParse } from "std/yaml/mod.ts";
import { parse as tomlParse } from "std/toml/mod.ts";
import { parse as csvParse } from "std/csv/mod.ts";

interface Result {
  table: string;
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

export function getTableName(basename: string): string {
  return basename.toLowerCase().replace(/^[^a-z]+/, "");
}

export async function parseFile(path: string): Promise<Result | null> {
  const ext = extname(path);
  if (ext === ".json") {
    const records = await parseJSONFile(path);
    const table = getTableName(basename(path, ".json"));
    return { records, table };
  } else {
    return null;
  }
}
