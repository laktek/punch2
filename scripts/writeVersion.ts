await Deno.writeTextFile("src/version.ts", `export const version="${Deno.env.get('PUNCH_VERSION')}"`);
