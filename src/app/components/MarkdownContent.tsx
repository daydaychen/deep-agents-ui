"use client";

import React, { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="absolute right-2 top-2 rounded-md bg-muted/50 p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-muted group-hover:opacity-100"
      title="Copy code"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

export const MarkdownContent = React.memo<MarkdownContentProps>(
  ({ content, className = "" }) => {
    return (
      <div
        className={cn(
          "prose prose-sm dark:prose-invert min-w-0 max-w-full overflow-hidden break-words leading-relaxed text-inherit",
          "[&_h1]:mt-6 [&_h1]:mb-4 [&_h1]:font-bold [&_h1]:text-lg",
          "[&_h2]:mt-5 [&_h2]:mb-3 [&_h2]:font-bold [&_h2]:text-base",
          "[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:font-bold [&_h3]:text-sm",
          "[&_p]:mb-4 [&_p:last-child]:mb-0",
          "[&_ul]:mb-4 [&_ol]:mb-4 [&_li]:mb-1",
          "[&_pre]:p-0 [&_pre]:bg-transparent",
          className
        )}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({
              inline,
              className,
              children,
              ...props
            }: {
              inline?: boolean;
              className?: string;
              children?: React.ReactNode;
            }) {
              const match = /language-(\w+)/.exec(className || "");
              const codeString = String(children).replace(/\n$/, "");
              
              if (!inline && match) {
                return (
                  <div className="group relative my-4 overflow-hidden rounded-lg border border-border bg-[#282c34]">
                    <div className="flex items-center justify-between px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 bg-muted/20 border-b border-border">
                      <span>{match[1]}</span>
                    </div>
                    <CopyButton text={codeString} />
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      className="!m-0 !bg-transparent text-xs"
                      wrapLines={true}
                      wrapLongLines={true}
                      lineProps={{
                        style: {
                          wordBreak: "break-all",
                          whiteSpace: "pre-wrap",
                          overflowWrap: "break-word",
                        },
                      }}
                      customStyle={{
                        padding: "1rem",
                        fontSize: "0.8rem",
                      }}
                    >
                      {codeString}
                    </SyntaxHighlighter>
                  </div>
                );
              }
              
              return (
                <code
                  className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em] font-medium text-foreground"
                  {...props}
                >
                  {children}
                </code>
              );
            },
            pre({ children }: { children?: React.ReactNode }) {
              return <>{children}</>;
            },
            a({
              href,
              children,
            }: {
              href?: string;
              children?: React.ReactNode;
            }) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
                >
                  {children}
                </a>
              );
            },
            blockquote({ children }: { children?: React.ReactNode }) {
              return (
                <blockquote className="my-4 border-l-4 border-primary/30 bg-muted/30 px-4 py-2 italic text-muted-foreground">
                  {children}
                </blockquote>
              );
            },
            table({ children }: { children?: React.ReactNode }) {
              return (
                <div className="my-4 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        {children?.[0]?.props?.children}
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {children?.[1]?.props?.children}
                    </tbody>
                  </table>
                </div>
              );
            },
            th({ children }: { children?: React.ReactNode }) {
              return <th className="border-b border-border p-2 text-left font-semibold">{children}</th>;
            },
            td({ children }: { children?: React.ReactNode }) {
              return <td className="border-b border-border p-2">{children}</td>;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }
);

MarkdownContent.displayName = "MarkdownContent";
