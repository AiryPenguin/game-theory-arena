import katex from 'katex';
import { Fragment, useMemo, type ReactNode } from 'react';
import { Term } from './Term';

const TOKEN = /(\$\$[\s\S]+?\$\$|\$[^$]+?\$|\*\*[^*]+?\*\*|\[\[[\w-]+\|[^\]]+\]\])/g;

function Tex({ src, display }: { src: string; display: boolean }) {
  const html = useMemo(() => katex.renderToString(src, { throwOnError: false, displayMode: display, strict: false }), [src, display]);
  return display ? (
    <span className="my-2 block overflow-x-auto overflow-y-hidden py-1" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  );
}

function renderTokens(text: string): ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    if (!part) return null;
    if (part.startsWith('$$') && part.endsWith('$$')) return <Tex key={i} src={part.slice(2, -2)} display />;
    if (part.startsWith('$') && part.endsWith('$') && part.length > 1) return <Tex key={i} src={part.slice(1, -1)} display={false} />;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const term = /^\[\[([\w-]+)\|([^\]]+)\]\]$/.exec(part);
    if (term) return <Term key={i} id={term[1]}>{term[2]}</Term>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

/**
 * Mini markup: $inline TeX$, $$display TeX$$, **bold**, [[glossaryId|text]], newlines.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const lines = text.split('\n');
  return (
    <span className={className}>
      {lines.map((l, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {renderTokens(l)}
        </Fragment>
      ))}
    </span>
  );
}
