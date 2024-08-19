const extensions = {
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      const escapedText = text.toLowerCase().replace(/[^\w]+/g, "-");

      return `
            <h${depth} id="${escapedText}">
              ${text}
            </h${depth}>`;
    },
  },
};

export default extensions;
