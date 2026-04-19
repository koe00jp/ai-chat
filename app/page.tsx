"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const MAX_CHARS = 2000;

const PRESETS = [
  { id: "general", label: "汎用", instructions: "あなたは親切で役立つAIアシスタントです。ユーザーの質問に丁寧に答えてください。" },
  { id: "translate", label: "翻訳", instructions: "あなたはプロの翻訳者です。ユーザーが入力したテキストを、日本語なら英語に、それ以外なら日本語に翻訳してください。翻訳結果のみを返してください。" },
  { id: "code", label: "コードレビュー", instructions: "あなたはシニアエンジニアです。ユーザーが貼り付けたコードをレビューし、問題点・改善点・セキュリティリスクを具体的に指摘してください。" },
  { id: "summary", label: "要約", instructions: "あなたは要約の専門家です。ユーザーが入力したテキストを、重要なポイントを箇条書きで簡潔にまとめてください。" },
] as const;

type PresetId = (typeof PRESETS)[number]["id"];
type Message = { role: "user" | "assistant"; content: string };

function UserAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
      You
    </div>
  );
}

function AIAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
      </svg>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="absolute top-2 right-2 px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
    >
      {copied ? "コピー済み" : "コピー"}
    </button>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match;
          const codeText = String(children).replace(/\n$/, "");
          return isInline ? (
            <code className="bg-gray-100 text-rose-600 rounded px-1 py-0.5 text-[0.85em] font-mono" {...props}>
              {children}
            </code>
          ) : (
            <div className="relative my-2">
              <CopyButton text={codeText} />
              <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" className="rounded-lg text-sm">
                {codeText}
              </SyntaxHighlighter>
            </div>
          );
        },
        p({ children }) { return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>; },
        ul({ children }) { return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>; },
        ol({ children }) { return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>; },
        li({ children }) { return <li className="leading-relaxed">{children}</li>; },
        h1({ children }) { return <h1 className="text-xl font-bold mb-2 mt-3">{children}</h1>; },
        h2({ children }) { return <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>; },
        h3({ children }) { return <h3 className="text-base font-bold mb-1 mt-2">{children}</h3>; },
        blockquote({ children }) {
          return <blockquote className="border-l-4 border-gray-300 pl-3 my-2 text-gray-600 italic">{children}</blockquote>;
        },
        table({ children }) {
          return <div className="overflow-x-auto my-2"><table className="border-collapse text-sm w-full">{children}</table></div>;
        },
        th({ children }) { return <th className="border border-gray-300 px-3 py-1 bg-gray-100 font-semibold text-left">{children}</th>; },
        td({ children }) { return <td className="border border-gray-300 px-3 py-1">{children}</td>; },
        a({ href, children }) {
          return <a href={href} className="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer">{children}</a>;
        },
        strong({ children }) { return <strong className="font-semibold">{children}</strong>; },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function getErrorMessage(status: number): string {
  if (status === 429) return "リクエストが多すぎます。しばらくしてから再試行してください。";
  if (status === 504 || status === 408) return "タイムアウトしました。もう一度お試しください。";
  if (status >= 500) return "サーバーエラーが発生しました。しばらくしてから再試行してください。";
  return "エラーが発生しました。もう一度お試しください。";
}

type ConversationSummary = { sessionId: string; preview: string; updatedAt: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [preset, setPreset] = useState<PresetId>("general");
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchConversations = useCallback(async () => {
    const data = await fetch("/api/conversations").then((r) => r.json()).catch(() => ({ conversations: [] }));
    setConversations(data.conversations ?? []);
  }, []);

  useEffect(() => {
    let id = localStorage.getItem("sessionId");
    if (!id) { id = uuidv4(); localStorage.setItem("sessionId", id); }
    setSessionId(id);
    fetch(`/api/conversations/${id}`)
      .then((r) => r.json())
      .then((data) => { if (data.messages?.length) setMessages(data.messages); })
      .catch(() => {});
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const switchSession = (id: string) => {
    localStorage.setItem("sessionId", id);
    setSessionId(id);
    setMessages([]);
    setLastFailedMessage(null);
    setSidebarOpen(false);
    fetch(`/api/conversations/${id}`)
      .then((r) => r.json())
      .then((data) => { if (data.messages?.length) setMessages(data.messages); })
      .catch(() => {});
  };

  const deleteConversation = async (id: string) => {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.sessionId !== id));
    if (id === sessionId) newChat();
  };

  const newChat = () => {
    const id = uuidv4();
    localStorage.setItem("sessionId", id);
    setSessionId(id);
    setMessages([]);
    setLastFailedMessage(null);
    setSidebarOpen(false);
    fetchConversations();
    showToast("新しい会話を開始しました");
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading || !sessionId) return;
    if (text.length > MAX_CHARS) return;

    setLastFailedMessage(null);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    const instructions = PRESETS.find((p) => p.id === preset)?.instructions;
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, sessionId, instructions }),
    });

    if (!res.ok || !res.body) {
      const errMsg = getErrorMessage(res.status);
      setMessages((prev) => [...prev, { role: "assistant", content: errMsg }]);
      setLastFailedMessage(text);
      setLoading(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      assistantText += decoder.decode(value, { stream: true });
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: assistantText };
        return updated;
      });
    }
    setLoading(false);
    fetchConversations();
  };

  const openSidebar = () => { setSidebarOpen(true); fetchConversations(); };

  const send = () => sendMessage(input.trim());
  const retry = () => { if (lastFailedMessage) sendMessage(lastFailedMessage); };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const remaining = MAX_CHARS - input.length;
  const isOverLimit = input.length > MAX_CHARS;

  return (
    <div className="flex h-[100dvh] bg-gray-50 overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none">
          {toast}
        </div>
      )}

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 bg-gray-900 text-white flex flex-col shrink-0 transition-all duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} ${sidebarCollapsed ? "lg:w-14" : "w-72"}`}>
        <div className="px-3 py-4 border-b border-gray-700 flex items-center justify-between min-h-[57px]">
          {!sidebarCollapsed && <span className="font-semibold text-sm">会話履歴</span>}
          <div className="flex items-center gap-1 ml-auto">
            {/* デスクトップ折りたたみボタン */}
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="hidden lg:flex text-gray-400 hover:text-white p-1 rounded"
              title={sidebarCollapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                {sidebarCollapsed
                  ? <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                  : <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>}
              </svg>
            </button>
            {/* モバイル閉じるボタン */}
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white p-1 rounded">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
        </div>

        <button
          onClick={newChat}
          className={`mx-2 mt-3 flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg px-3 py-2.5 transition-colors ${sidebarCollapsed ? "justify-center" : ""}`}
          title="新しい会話"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          {!sidebarCollapsed && "新しい会話"}
        </button>

        <div className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
          {!sidebarCollapsed && conversations.length === 0 && (
            <p className="text-xs text-gray-500 px-2 py-4 text-center">会話履歴がありません</p>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.sessionId}
              className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                conv.sessionId === sessionId ? "bg-gray-700" : "hover:bg-gray-800"
              } ${sidebarCollapsed ? "justify-center" : ""}`}
              onClick={() => switchSession(conv.sessionId)}
              title={conv.preview}
            >
              {sidebarCollapsed ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-gray-400 shrink-0"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{conv.preview}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{new Date(conv.updatedAt).toLocaleDateString("ja-JP")}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteConversation(conv.sessionId); }}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all shrink-0"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm shrink-0">
          <button onClick={openSidebar} className="lg:hidden text-gray-500 hover:text-gray-800">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
          </button>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white fill-current">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-gray-900 leading-none">AI Chat</h1>
            <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">Powered by Groq</p>
          </div>

          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as PresetId)}
            className="ml-2 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>

          <div className="ml-auto hidden lg:flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-500">オンライン</span>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-indigo-400 fill-current">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                </svg>
              </div>
              <p className="text-sm">何でも聞いてください</p>
              <p className="text-xs text-gray-300">モード: {PRESETS.find((p) => p.id === preset)?.label}</p>
            </div>
          )}

          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {m.role === "user" ? <UserAvatar /> : <AIAvatar />}
                <div className={`group relative max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "bg-blue-500 text-white rounded-tr-none shadow-sm"
                    : "bg-white text-gray-800 border border-gray-200 rounded-tl-none shadow-sm"
                }`}>
                  {m.role === "assistant" ? (
                    m.content ? (
                      <>
                        <MarkdownContent content={m.content} />
                        <button
                          onClick={async () => { await navigator.clipboard.writeText(m.content); showToast("コピーしました"); }}
                          className="absolute -bottom-7 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                        >
                          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                          コピー
                        </button>
                      </>
                    ) : (
                      <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse rounded-sm" />
                    )
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  )}
                </div>
              </div>
            ))}

            {lastFailedMessage && !loading && (
              <div className="flex justify-center">
                <button onClick={retry} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-300 hover:border-gray-400 rounded-full px-4 py-2 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                  再試行
                </button>
              </div>
            )}

            {loading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-3">
                <AIAvatar />
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t px-4 py-3 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className={`flex gap-3 items-end bg-gray-50 border rounded-2xl px-4 py-3 transition-all ${
              isOverLimit ? "border-red-400 ring-2 ring-red-100" : "border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100"
            }`}>
              <textarea
                ref={textareaRef}
                className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none leading-relaxed max-h-40"
                rows={1}
                placeholder="メッセージを入力… (Shift+Enterで改行)"
                value={input}
                onChange={(e) => { setInput(e.target.value); autoResize(); }}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim() || isOverLimit}
                className="shrink-0 w-8 h-8 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-white">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
            <div className="flex justify-between items-center mt-1.5 px-1">
              <p className="text-xs text-gray-400">AIは誤った情報を生成することがあります。重要な情報は必ず確認してください。</p>
              <span className={`text-xs tabular-nums ${isOverLimit ? "text-red-500 font-medium" : remaining <= 200 ? "text-yellow-500" : "text-gray-300"}`}>
                {remaining}
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
