import { encodeBase64 as b64encode } from "@std/encoding";

let src = "";

// gitignore
const gitignore = await Deno.readTextFile("template/.gitignore");
src += `export const gitignore = \`${gitignore}\`;\n`;

// main css
const mainCSS = await Deno.readTextFile("template/css/main.css");
src += `export const mainCSS = \`${mainCSS}\`;\n`;

const tailwindCSS = await Deno.readTextFile("template/css/tailwind.css");
src += `export const tailwindCSS = \`${tailwindCSS}\`;\n`;

// partial - head
const headPartial = await Deno.readTextFile("template/partials/head.html");
src += `export const headPartial = \`${
  headPartial.replace(/[`$]/g, "\\$&")
}\`;\n`;

// partial - footer
const footerPartial = await Deno.readTextFile("template/partials/footer.html");
src += `export const footerPartial = \`${
  footerPartial.replace(/[`$]/g, "\\$&")
}\`;\n`;

// partial - topbar
const topbarPartial = await Deno.readTextFile("template/partials/topbar.html");
src += `export const topbarPartial = \`${
  topbarPartial.replace(/[`$]/g, "\\$&")
}\`;\n`;

// pages - index
const indexPage = await Deno.readTextFile("template/pages/index.html");
src += `export const indexPage = \`${indexPage.replace(/[`$]/g, "\\$&")}\`;\n`;

// pages - archive
const archivePage = await Deno.readTextFile("template/pages/archive.html");
src += `export const archivePage = \`${
  archivePage.replace(/[`$]/g, "\\$&")
}\`;\n`;

// pages - now
const nowPage = await Deno.readTextFile("template/pages/now.html");
src += `export const nowPage = \`${nowPage.replace(/[`$]/g, "\\$&")}\`;\n`;

// blog page template
const blogPage = await Deno.readTextFile("template/pages/blog/_slug_.html");
src += `export const blogPage = \`${blogPage.replace(/[`$]/g, "\\$&")}\`;\n`;

// not found page template
const notFoundPage = await Deno.readTextFile("template/pages/404.html");
src += `export const notFoundPage = \`${
  notFoundPage.replace(/[`$]/g, "\\$&")
}\`;\n`;

// rss feed
const feed = await Deno.readTextFile("template/feeds/rss.xml");
src += `export const feed = \`${feed.replace(/[`$]/g, "\\$&")}\`;\n`;

// site contents
const siteContents = await Deno.readTextFile("template/contents/site.json");
src += `export const siteContents = \`${siteContents}\`;\n`;

// hello world post
const helloWorldPost = await Deno.readTextFile(
  "template/contents/blog/hello-world.md",
);
src += `export const helloWorldPost = \`${
  helloWorldPost.replace(/[`$]/g, "\\$&")
}\`;\n`;

// second post
const secondPost = await Deno.readTextFile(
  "template/contents/blog/second-post.md",
);
src += `export const secondPost = \`${
  secondPost.replace(/[`$]/g, "\\$&")
}\`;\n`;

// third post
const thirdPost = await Deno.readTextFile(
  "template/contents/blog/third-post.md",
);
src += `export const thirdPost = \`${thirdPost.replace(/[`$]/g, "\\$&")}\`;\n`;

// contents - now
const nowContent = await Deno.readTextFile(
  "template/contents/now.md",
);
src += `export const nowContent = \`${
  nowContent.replace(/[`$]/g, "\\$&")
}\`;\n`;

// hello-world image
const helloWorldImage = await Deno.readFile("template/images/hello-world.png");
src += `export const helloWorldImage = '${b64encode(helloWorldImage)}';\n`;

// punch.json
const punchJson = await Deno.readTextFile(
  "template/punch.jsonc",
);
src += `export const punchJson = \`${punchJson}\`;\n`;

// favicon
const favicon = await Deno.readFile("template/public/favicon.ico");
src += `export const favicon = '${b64encode(favicon)}';\n`;

await Deno.writeTextFile("src/utils/template.ts", src);
console.info("wrote src/utils/template.ts");
