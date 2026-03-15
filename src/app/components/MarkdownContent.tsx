"use client";

import React, { useState, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { COPY_SUCCESS_DURATION_MS } from "@/lib/constants";
import { Check, Copy } from "lucide-react";
import { useTheme } from "next-themes";

// Hoisted RegExp to avoid recreating on each render
const LANGUAGE_REGEX = /language-(\w+)/;

interface MarkdownContentProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_SUCCESS_DURATION_MS);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="absolute right-2 top-2 rounded-md bg-muted/50 p-1.5 text-muted-foreground opacity-0 transition-[opacity,background-color,color] hover:bg-muted group-hover:opacity-100"
      title="Copy code"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-success" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
};

export const MarkdownContent = React.memo<MarkdownContentProps>(
  ({ content, className = "", isStreaming = false }) => {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    const isDark = resolvedTheme === "dark";

    return (
      <div
        className={cn(
          "prose prose-sm dark:prose-invert min-w-0 max-w-full overflow-hidden break-words leading-relaxed text-inherit",
          "[&_pre]:!bg-transparent [&_pre]:!p-0",
          "[&_code]:!bg-transparent",
          "[&_code_*]:!bg-transparent",
          "[&_.react-syntax-highlighter]:!bg-transparent",
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
              const match = LANGUAGE_REGEX.exec(className || "");
              const codeString = String(children).replace(/\n$/, "");

              // Early exit for inline code or non-language code blocks
              if (inline || !match) {
                return (
                  <code
                    className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em] font-medium text-foreground"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }

              // Use explicit logic-based coloring to avoid Tailwind 'dark:' prefix issues
              const containerBg =
                mounted && isDark ? "bg-[#1e1e1e]" : "bg-zinc-50";
              const headerBg =
                mounted && isDark ? "bg-zinc-900/80" : "bg-muted/40";

              return (
                <div
                  className={cn(
                    "group relative my-2 overflow-hidden rounded-lg border border-border shadow-sm",
                    containerBg
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-between border-b border-border px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70",
                      headerBg
                    )}
                  >
                    <span>{match[1]}</span>
                  </div>
                  {!isStreaming && <CopyButton text={codeString} />}
                  {mounted && !isStreaming ? (
                    <SyntaxHighlighter
                      style={isDark ? oneDark : oneLight}
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
                          backgroundColor: "transparent",
                        },
                      }}
                      customStyle={{
                        padding: "1rem",
                        fontSize: "0.8rem",
                        backgroundColor: "transparent",
                        background: "transparent",
                      }}
                    >
                      {codeString}
                    </SyntaxHighlighter>
                  ) : (
                    <pre className="overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-xs">
                      <code>{codeString}</code>
                    </pre>
                  )}
                </div>
              );
            },
            pre({ children }: { children?: React.ReactNode }) {
              return <>{children}</>;
            },
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
              >
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-primary/30 my-2 border-l-4 bg-muted/30 px-4 py-2 italic text-muted-foreground">
                {children}
              </blockquote>
            ),
            table: ({ children }) => (
              <div className="my-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-sm">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-muted/50 text-muted-foreground">
                {children}
              </thead>
            ),
            tr: ({ children }) => (
              <tr className="border-b border-border transition-colors last:border-0 hover:bg-muted/30">
                {children}
              </tr>
            ),
            th: ({ children }) => (
              <th className="p-3 text-left align-middle font-semibold">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="p-3 align-middle">{children}</td>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }
);

MarkdownContent.displayName = "MarkdownContent";
