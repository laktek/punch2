import { type Renderer, type Tokens } from "marked";

const extensions = {
  renderer: {
    heading({ tokens, depth }: Tokens.Heading): string {
      const text: string = this.parser.parseInline(tokens);
      const escapedText = text.toLowerCase().replace(/[^\w]+/g, "-");

      return `
            <h${depth} id="${escapedText}">
              ${text}
            </h${depth}>`;
    },
  } as Renderer,
};

export default extensions;
