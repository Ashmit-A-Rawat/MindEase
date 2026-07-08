import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import axios from "axios";

const CHAT_API = import.meta.env.VITE_CHAT_SERVICE_URL || "http://localhost:5007";

const STARTER_PROMPTS = [
  "I'm feeling really anxious about my exams",
  "I've been having trouble sleeping",
  "How do I deal with academic pressure?",
];

// The system prompt asks for **bold** and "- " bullets; render just enough
// markdown to make those readable instead of showing literal asterisks —
// not a full markdown library, since that's the only formatting it uses.
function renderFormattedText(text) {
  const renderInline = (line, keyPrefix) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={`${keyPrefix}-${i}`}>{part}</span>
      )
    );
  };

  return text.split("\n").map((line, i) => {
    const bulletMatch = line.match(/^[-*]\s+(.*)/);
    if (bulletMatch) {
      return (
        <div key={i} className="flex gap-2 pl-1">
          <span>•</span>
          <span>{renderInline(bulletMatch[1], i)}</span>
        </div>
      );
    }
    return line.trim() === "" ? <div key={i} className="h-2" /> : <div key={i}>{renderInline(line, i)}</div>;
  });
}

export default function ChatBot() {
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMessage = { role: "user", content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await axios.post(`${CHAT_API}/chat`, {
        message: trimmed,
        // Only the last few turns — keeps the prompt small and this is a
        // supportive chat, not a long-form document conversation.
        history: newMessages.slice(-6),
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.response, isCrisis: res.data.is_crisis, sources: res.data.sources },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setError("AI Support is temporarily unavailable. Please try again in a moment, or book a session with a counsellor.");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 flex items-center justify-center bg-white z-50"
          >
            <div className="flex flex-col items-center">
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full mb-4"
              ></motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-gray-600 font-medium"
              >
                Preparing your AI companion...
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-blue-400 to-indigo-500 text-white py-6 md:py-8 text-center rounded-2xl shadow-lg mb-6"
      >
        <h1 className="text-2xl md:text-3xl font-bold tracking-wide">MindEase AI Companion</h1>
        <p className="mt-2 text-base md:text-lg opacity-95">Hi! What can I help you with?</p>
      </motion.header>

      <main className="flex-grow flex items-center justify-center mb-6">
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-4xl h-[65vh] bg-white shadow-xl rounded-2xl overflow-hidden border border-indigo-100 flex flex-col"
        >
          {/* Message list */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-gray-500 mb-6">Start a conversation, or try one of these:</p>
                <div className="flex flex-col gap-2 w-full max-w-sm">
                  {STARTER_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="text-left px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white whitespace-pre-wrap"
                      : m.isCrisis
                      ? "bg-red-50 border-2 border-red-300 text-red-900"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {m.role === "user" ? m.content : renderFormattedText(m.content)}
                  {m.sources?.length > 0 && (
                    <p className="mt-2 text-xs opacity-60">Related: {m.sources.map((s) => s.replace(".md", "").replace(/-/g, " ")).join(", ")}</p>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3 flex gap-1.5">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {error && <div className="text-center text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-gray-100 p-3 md:p-4 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type how you're feeling..."
              disabled={sending}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Send
            </button>
          </form>
        </motion.div>
      </main>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="text-center text-xs text-gray-500 mt-4"
      >
        <p>This is supportive AI, not a replacement for professional care.</p>
        <p className="mt-1">For immediate crisis support, please contact emergency services.</p>
      </motion.footer>
    </div>
  );
}
