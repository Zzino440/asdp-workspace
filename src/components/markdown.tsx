import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Stili del Markdown con i token del tema (niente plugin typography).
const components: Components = {
  h1: (props) => <h1 className="mt-6 mb-3 text-2xl font-semibold first:mt-0" {...props} />,
  h2: (props) => <h2 className="mt-6 mb-3 text-xl font-semibold" {...props} />,
  h3: (props) => <h3 className="mt-4 mb-2 text-lg font-semibold" {...props} />,
  p: (props) => <p className="my-3 leading-relaxed" {...props} />,
  ul: (props) => <ul className="my-3 list-disc pl-6" {...props} />,
  ol: (props) => <ol className="my-3 list-decimal pl-6" {...props} />,
  blockquote: (props) => <blockquote className="my-3 border-l-2 pl-4 text-muted-foreground" {...props} />,
  a: (props) => <a className="text-primary underline-offset-4 hover:underline" {...props} />,
  code: (props) => <code className="rounded bg-muted px-1 font-mono text-sm" {...props} />,
  hr: () => <hr className="my-6 border-border" />,
  table: (props) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => <th className="border border-border bg-muted px-2 py-1 text-left font-medium" {...props} />,
  td: (props) => <td className="border border-border px-2 py-1 align-top" {...props} />,
};

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
