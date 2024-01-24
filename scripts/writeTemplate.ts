import { encode as b64encode } from "std/encoding/base64.ts";

let src = "";

// gitignore
const gitignore = await Deno.readTextFile("template/.gitignore");
src += `export const gitignore = \`${gitignore}\`;\n`;

// main css
const mainCSS = await Deno.readTextFile("template/css/main.css");
src += `export const mainCSS = \`${mainCSS}\`;\n`;

// element - head
const headElement = await Deno.readTextFile("template/elements/head.html");
src += `export const headElement = \`${headElement}\`;\n`;

// index
const indexPage = await Deno.readTextFile("template/pages/index.html");
src += `export const indexPage = \`${indexPage}\`;\n`;

// blog page template
const blogPage = await Deno.readTextFile("template/pages/blog/_slug_.html");
src += `export const blogPage = \`${blogPage}\`;\n`;

// not found page template
const notFoundPage = await Deno.readTextFile("template/pages/404.html");
src += `export const notFoundPage = \`${notFoundPage}\`;\n`;

// rss feed
const feed = await Deno.readTextFile("template/feeds/rss.xml");
src += `export const feed = \`${feed}\`;\n`;

// site contents
const siteContents = await Deno.readTextFile("template/contents/site.json");
src += `export const siteContents = \`${siteContents}\`;\n`;

// hello world post
const helloWorldPost = await Deno.readTextFile(
  "template/contents/blog/hello-world.md",
);
src += `export const helloWorldPost = \`${helloWorldPost}\`;\n`;

// another post
const anotherPost = await Deno.readTextFile(
  "template/contents/blog/another-post.md",
);
src += `export const anotherPost = \`${anotherPost}\`;\n`;

// punch.json
const punchJson = await Deno.readTextFile(
  "template/punch.json",
);
src += `export const punchJson = \`${punchJson}\`;\n`;

// favicon
const favicon = await Deno.readFile("template/favicon.ico");
src += `export const favicon = '${b64encode(favicon)}';\n`;

await Deno.writeTextFile("src/utils/template.ts", src);
console.info("wrote src/utils/template.ts");
