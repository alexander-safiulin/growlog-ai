'use client';

import katex from 'katex';
import { useMemo } from 'react';

export function NutrientHelpMath({ latex, display }: { latex: string; display?: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: display ?? false,
        output: 'html',
      });
    } catch {
      return latex;
    }
  }, [latex, display]);

  if (display) {
    return (
      <div
        className="my-3 overflow-x-auto text-sm [&_.katex]:text-base"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <span className="text-sm [&_.katex]:text-sm" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
