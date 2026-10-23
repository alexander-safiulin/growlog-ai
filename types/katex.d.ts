declare module 'katex' {
  export function renderToString(
    tex: string,
    options?: {
      throwOnError?: boolean;
      displayMode?: boolean;
      output?: 'html' | 'mathml' | 'htmlAndMathml';
    },
  ): string;
}
