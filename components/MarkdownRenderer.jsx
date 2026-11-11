'use client';

import { Children, isValidElement, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Check, Code2, Copy } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';

const LANGUAGE_LABELS = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  jsx: 'JSX',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  tsx: 'TSX',
  py: 'Python',
  python: 'Python',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  json: 'JSON',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  powershell: 'PowerShell',
  sql: 'SQL',
  md: 'Markdown',
  markdown: 'Markdown',
  text: 'Code',
};

function childrenToText(children) {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return String(child);
      }
      if (isValidElement(child)) {
        return childrenToText(child.props.children);
      }
      return '';
    })
    .join('');
}

function CodeBlock({ codeElement }) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef(null);
  const props = codeElement.props || {};
  const className = props.className || '';
  const match = className.match(/language-([\w-]+)/);
  const language = match?.[1]?.toLowerCase() || 'text';
  const label = LANGUAGE_LABELS[language] || language;
  const rawCode = childrenToText(props.children).replace(/\n$/, '');

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  async function handleCopy() {
    const ok = await copyToClipboard(rawCode);
    if (!ok) return;
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-language">
          <Code2 size={13} aria-hidden="true" />
          {label}
        </span>
        <button
          type="button"
          className="code-copy"
          onClick={handleCopy}
          aria-label={copied ? 'Code copied' : 'Copy code'}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="code-block-pre">
        <code className={className}>{props.children}</code>
      </pre>
    </div>
  );
}

export default function MarkdownRenderer({ content }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          pre({ children }) {
            const child = Children.toArray(children)[0];
            if (!isValidElement(child)) {
              return <pre>{children}</pre>;
            }
            return <CodeBlock codeElement={child} />;
          },
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                {...props}
              >
                {children}
              </a>
            );
          },
          img({ src, alt, ...props }) {
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={alt || ''} loading="lazy" {...props} />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
