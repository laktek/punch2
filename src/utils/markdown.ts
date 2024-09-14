import { MarkedOptions, Renderer, type Tokens } from "marked";

export default class CustomRenderer extends Renderer {
  #headings: { depth: number; text: string; slug: string }[];

  constructor(opts?: MarkedOptions | undefined) {
    super(opts);
    this.#headings = [];
  }

  getHeadings() {
    return this.#headings;
  }

  heading({ tokens, depth }: Tokens.Heading): string {
    const text: string = this.parser.parseInline(tokens);
    const slug = text.toLowerCase().replace(/[^\w]+/g, "-");
    this.#headings.push({ depth, text, slug });

    return `<h${depth} id="${slug}">${text}</h${depth}>\n`;
  }
}
