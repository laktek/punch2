export default function createNew(path: string, template?: string) {
  if (template !== undefined) {
    console.error(
      "creating a new site from template is currently not supported",
    );
  }

  // create sitemap.json
  // create directory /pages
  // create directory ./public
  // create directory ./elements
  // create directory ./contents
}
