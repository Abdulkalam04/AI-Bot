"use client";
import { useEffect, useRef, useState } from "react";
import type { ReactNode, ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { MoonStarIcon, MusicIcon, CheckIcon, CopyIcon, RefreshIcon } from "./Icons";
import styles from "./Chat.module.css";
import { APP_NAME } from "@/lib/config";

export type Msg = {
  id: string;
  role: "user" | "typing" | "assistant" | "reply";
  text?: string;
  actions?: ReactNode;
  choices?: Choice[];
  chosen?: string;
  fromComposer?: boolean;
  context?: { label: string; iso: string };
  leaving?: boolean;
  taskConfirmation?: string;
  /** preview URLs for display only — not persisted to history */
  imagePreviews?: string[];
};
export type Choice = { id: string; label: string; icon: "moon" | "music" };

// ---- word-by-word fade for plain (non-markdown) text ----
function Words({ text }: { text: string }) {
  const previousCount = useRef(0);
  const words = text.split(" ");
  useEffect(() => { previousCount.current = words.length; }, [words.length]);
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          {i > 0 && " "}
          <span
            className={i >= previousCount.current ? styles.w : undefined}
            style={i >= previousCount.current ? { animationDelay: `${(i - previousCount.current) * 110}ms` } : undefined}
          >{w}</span>
        </span>
      ))}
    </>
  );
}

// ---- inline code-copy button ----
function CodeBlock({ children, className }: ComponentPropsWithoutRef<"code"> & { inline?: boolean }) {
  const [copied, setCopied] = useState(false);
  const isBlock = className?.startsWith("language-");
  const codeText = typeof children === "string" ? children : String(children ?? "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText.trimEnd());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  if (!isBlock) {
    return <code className={styles.inlineCode}>{children}</code>;
  }

  const lang = className ? className.replace("language-", "") : "";
  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        {lang && <span className={styles.codeLang}>{lang}</span>}
        <button className={styles.codeCopy} onClick={handleCopy} aria-label="Copy code">
          {copied ? <CheckIcon width={12} height={12} /> : <CopyIcon width={12} height={12} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className={styles.codePre}><code>{children}</code></pre>
    </div>
  );
}

// ---- react-markdown component overrides ----
const mdComponents: Components = {
  // Safe external links
  a: ({ href, children, ...rest }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.mdLink}
      {...rest}
    >
      {children}
    </a>
  ),
  // Code: block vs inline handled by presence of className
  code: ({ className, children, ...rest }) => (
    <CodeBlock className={className} {...rest}>{children}</CodeBlock>
  ),
  // Don't render <pre> wrapper ourselves — CodeBlock owns it
  pre: ({ children }) => <>{children}</>,
  p:          ({ children }) => <p className={styles.mdP}>{children}</p>,
  ul:         ({ children }) => <ul className={styles.mdUl}>{children}</ul>,
  ol:         ({ children }) => <ol className={styles.mdOl}>{children}</ol>,
  li:         ({ children }) => <li className={styles.mdLi}>{children}</li>,
  strong:     ({ children }) => <strong className={styles.mdStrong}>{children}</strong>,
  em:         ({ children }) => <em className={styles.mdEm}>{children}</em>,
  h1:         ({ children }) => <h3 className={`${styles.mdH} ${styles.mdH1}`}>{children}</h3>,
  h2:         ({ children }) => <h3 className={`${styles.mdH} ${styles.mdH2}`}>{children}</h3>,
  h3:         ({ children }) => <h3 className={`${styles.mdH} ${styles.mdH3}`}>{children}</h3>,
  blockquote: ({ children }) => <blockquote className={styles.mdBlockquote}>{children}</blockquote>,
  hr:         () => <hr className={styles.mdHr} />,
  table:      ({ children }) => <div className={styles.mdTableWrap}><table className={styles.mdTable}>{children}</table></div>,
  th:         ({ children }) => <th className={styles.mdTh}>{children}</th>,
  td:         ({ children }) => <td className={styles.mdTd}>{children}</td>,
};

// Detect if text is "plain" (no markdown markers) so we can use word-fade
function isPlainText(text: string): boolean {
  return !/[*_`#\[\]>|~\n]/.test(text);
}

// ---- MarkdownReply: fades in newly appended content ----
function MarkdownReply({ text, streaming }: { text: string; streaming: boolean }) {
  const prevLenRef = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Plain text while streaming → use word-fade; otherwise render markdown
  const plain = streaming && isPlainText(text);

  useEffect(() => {
    if (!streaming || plain) { prevLenRef.current = text.length; return; }
    // For markdown mode: add a brief fade-in class to newly appended paragraph nodes
    const el = wrapRef.current;
    if (!el) return;
    // Mark children that exist beyond the previously seen length as "new"
    const all = el.querySelectorAll<HTMLElement>("p,li,pre,blockquote,h3,tr");
    all.forEach((node) => {
      if (!node.dataset.seen) {
        node.dataset.seen = "1";
        node.classList.add(styles.mdNew);
        // Remove the class after animation completes so re-renders stay clean
        node.addEventListener("animationend", () => node.classList.remove(styles.mdNew), { once: true });
      }
    });
    prevLenRef.current = text.length;
  });

  if (plain) {
    return <Words text={text} />;
  }

  return (
    <div ref={wrapRef} className={styles.mdBody}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

// ---- Copy / Retry bar under each reply ----
function ReplyActions({ text, onRegenerate, streaming }: { text: string; onRegenerate?: () => void; streaming?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };
  return (
    <div className={styles.replyActions}>
      <button
        className={`${styles.replyBtn} ${copied ? styles.replyBtnDone : ""}`}
        aria-label="Copy reply"
        onClick={handleCopy}
        disabled={!text || streaming}
      >
        {copied ? <CheckIcon width={13} height={13} /> : <CopyIcon width={13} height={13} />}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
      {onRegenerate && (
        <button
          className={styles.replyBtn}
          aria-label="Regenerate reply"
          onClick={onRegenerate}
          disabled={streaming}
        >
          <RefreshIcon width={13} height={13} />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}

// ---- main Chat component ----
export default function Chat({
  messages,
  onChoose,
  onRegenerate,
  streamingId,
}: {
  messages: Msg[];
  onChoose?: (msgId: string, choiceId: string) => void;
  onRegenerate?: (replyId: string) => void;
  streamingId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const t = setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }), 60);
    return () => clearTimeout(t);
  }, [messages]);

  return (
    <div ref={ref} className={`${styles.chat} ${messages.some((m) => m.leaving) ? styles.leavingChat : ""}`}>
      {messages.map((m, index) => {
        if (m.role === "user")
          return (
            <div key={m.id} className={`${styles.userWrap} ${m.leaving ? styles.leaving : ""}`} style={m.leaving ? { animationDelay: `${index * 40}ms` } : undefined}>
              {m.imagePreviews && m.imagePreviews.length > 0 && (
                <div className={styles.userImages}>
                  {m.imagePreviews.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src} alt="" className={styles.userImage} />
                  ))}
                </div>
              )}
              {m.text && <div className={`${styles.user} ${m.fromComposer ? styles.fly : ""}`}>{m.text}</div>}
              {m.context && m.context.label !== "Today" && <span className={styles.contextCaption}>for {m.context.label}</span>}
            </div>
          );

        if (m.role === "reply") {
          const isStreaming = m.id === streamingId;
          return (
            <div key={m.id} className={styles.replyWrap}>
              {m.taskConfirmation && (
                <div className={styles.taskBadge}>
                  <CheckIcon width={13} height={13} />
                  <span>{m.taskConfirmation}</span>
                </div>
              )}
              <div className={styles.reply}>
                <MarkdownReply text={m.text ?? ""} streaming={isStreaming} />
              </div>
              <ReplyActions
                text={m.text ?? ""}
                onRegenerate={onRegenerate ? () => onRegenerate(m.id) : undefined}
                streaming={isStreaming}
              />
            </div>
          );
        }

        if (m.role === "typing")
          return (
            <div key={m.id} className={styles.typing} aria-label={`${APP_NAME} is typing`}>
              <i /><i /><i />
            </div>
          );

        return (
          <div key={m.id} className={styles.card}>
            <p className={styles.q}><Words text={m.text ?? ""} /></p>
            <div className={styles.actions}>
              {m.choices && (
                <div className={styles.choices}>
                  {m.choices.map((c) => (
                    <button
                      key={c.id}
                      disabled={!!m.chosen}
                      onClick={() => onChoose?.(m.id, c.id)}
                      className={`${styles.opt} ${m.chosen === c.id ? styles.on : ""} ${m.chosen && m.chosen !== c.id ? styles.off : ""}`}
                    >
                      {c.icon === "moon" ? <MoonStarIcon width={22} height={22} /> : <MusicIcon width={22} height={22} />}
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              )}
              {m.actions}
            </div>
          </div>
        );
      })}
    </div>
  );
}
