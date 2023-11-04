import { basename, dirname, join, relative } from "std/path/mod.ts";

export const commonSkipPaths = [
  /^(?=.*\/\.).+$/, // dot files and directories
];
