"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import type { Components } from "react-markdown";

/**
 * Custom sanitize schema that extends the default to allow:
 * - className on code/pre/span (needed for syntax highlighting)
 * - id on headings (needed for rehype-slug anchors)
 * - input[type=checkbox] for GFM task lists
 */
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), "className"],
    span: [...(defaultSchema.attributes?.span || []), "className"],
    pre: [...(defaultSchema.attributes?.pre || []), "className"],
    h1: [...(defaultSchema.attributes?.h1 || []), "id"],
    h2: [...(defaultSchema.attributes?.h2 || []), "id"],
    h3: [...(defaultSchema.attributes?.h3 || []), "id"],
    h4: [...(defaultSchema.attributes?.h4 || []), "id"],
    h5: [...(defaultSchema.attributes?.h5 || []), "id"],
    h6: [...(defaultSchema.attributes?.h6 || []), "id"],
    input: [...(defaultSchema.attributes?.input || []), "checked", "disabled", "type"],
  },
  tagNames: [...(defaultSchema.tagNames || []), "input"],
};

/**
 * Custom component overrides for react-markdown.
 * Applies ClawStak brand styling to all markdown elements.
 */
const components: Components = {
  // ── Headings ──
  h1: ({ children, ...props }) => (
    <h1
      className="font-serif text-3xl text-navy mt-10 mb-4 leading-snug scroll-mt-20"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="font-serif text-2xl text-navy mt-8 mb-3 leading-snug scroll-mt-20"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="font-serif text-xl text-navy mt-6 mb-2 leading-snug scroll-mt-20"
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4
      className="font-serif text-lg text-navy mt-5 mb-2 leading-snug scroll-mt-20"
      {...props}
    >
      {children}
    </h4>
  ),
  h5: ({ children, ...props }) => (
    <h5
      className="font-serif text-base text-navy mt-4 mb-1 leading-snug scroll-mt-20"
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ children, ...props }) => (
    <h6
      className="font-serif text-sm text-navy mt-4 mb-1 leading-snug scroll-mt-20 uppercase tracking-wide"
      {...props}
    >
      {children}
    </h6>
  ),

  // ── Paragraphs ──
  p: ({ children, ...props }) => (
    <p
      className="font-sans text-base leading-relaxed text-foreground/90 mb-5"
      {...props}
    >
      {children}
    </p>
  ),

  // ── Links ──
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      className="text-light-blue hover:underline underline-offset-2 transition-colors"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      {...props}
    >
      {children}
    </a>
  ),

  // ── Blockquotes ──
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-4 border-light-blue pl-5 my-6 italic text-foreground/70"
      {...props}
    >
      {children}
    </blockquote>
  ),

  // ── Code blocks ──
  pre: ({ children, ...props }) => (
    <pre
      className="bg-navy text-stone rounded-lg p-5 my-6 overflow-x-auto text-sm leading-relaxed font-mono"
      {...props}
    >
      {children}
    </pre>
  ),

  // ── Inline code ──
  code: ({ children, className, ...props }) => {
    // If className contains "hljs" or "language-", it's inside a <pre> block
    const isBlock = className?.includes("hljs") || className?.includes("language-");
    if (isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="bg-navy/10 text-navy rounded px-1.5 py-0.5 text-sm font-mono"
        {...props}
      >
        {children}
      </code>
    );
  },

  // ── Lists ──
  ul: ({ children, ...props }) => (
    <ul
      className="list-disc pl-6 mb-5 space-y-1.5 font-sans text-foreground/90"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      className="list-decimal pl-6 mb-5 space-y-1.5 font-sans text-foreground/90"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),

  // ── Tables ──
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto my-6 rounded-lg border border-navy/10">
      <table
        className="w-full text-sm font-sans border-collapse"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-navy/5 text-navy font-medium" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }) => (
    <tbody className="[&>tr:nth-child(even)]:bg-stone/50" {...props}>
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }) => (
    <tr className="border-b border-navy/10 last:border-0" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }) => (
    <th
      className="px-4 py-2.5 text-left text-xs uppercase tracking-wide text-navy/70"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="px-4 py-2.5 text-foreground/80" {...props}>
      {children}
    </td>
  ),

  // ── Images ──
  img: ({ src, alt, ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || ""}
      className="rounded-lg max-w-full h-auto my-6 mx-auto"
      loading="lazy"
      {...props}
    />
  ),

  // ── Horizontal rule ──
  hr: ({ ...props }) => (
    <hr className="border-navy/10 my-8" {...props} />
  ),

  // ── Strong / Em ──
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-navy" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <article className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeSanitize, sanitizeSchema],
          rehypeSlug,
          rehypeHighlight,
        ]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
