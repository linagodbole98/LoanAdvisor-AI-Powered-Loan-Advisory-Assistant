import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { chatService } from "../services/loanService";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const QUICK_PROMPTS = [
  "What is my recommended loan product?",
  "Compare shorter vs longer tenure for me",
  "What will my total repayment cost be?",
  "Why am I not eligible for certain products?",
  "What is the EMI for my top recommendation?",
];

// Allowed file types matching LLM wrapper spec
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_PDF_TYPE = "application/pdf";

/**
 * Convert a File to raw base64 (no data URI prefix — as required by LLM wrapper)
 */
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Strip the "data:<mime>;base64," prefix — wrapper needs raw base64 only
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Message = ({ msg }) => {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm mr-2 flex-shrink-0 mt-0.5">
          🤖
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
        }`}
      >
        {/* Show file attachment badge if present */}
        {msg.attachment && (
          <div className={`flex items-center gap-1.5 mb-2 text-xs px-2 py-1 rounded-md w-fit ${isUser ? "bg-blue-500 text-blue-100" : "bg-gray-100 text-gray-600"}`}>
            <span>{msg.attachment.type === "pdf" ? "📄" : "🖼️"}</span>
            <span className="truncate max-w-[150px]">{msg.attachment.name}</span>
          </div>
        )}
        {msg.content.split("\n").map((line, i) => (
          <p key={i} className={i > 0 ? "mt-1" : ""}>{line}</p>
        ))}
        <p className={`text-xs mt-1.5 ${isUser ? "text-blue-200" : "text-gray-400"}`}>
          {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm ml-2 flex-shrink-0 mt-0.5">
          👤
        </div>
      )}
    </div>
  );
};

const ChatPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  // Attached file state
  const [attachedFile, setAttachedFile] = useState(null); // { file, base64, type, mediaType, name }
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Guard: loan profile must exist
  useEffect(() => {
    if (!user?.loanProfile?.loanAmount) {
      toast.error("Please complete your loan profile first");
      navigate("/loan-form");
    }
  }, [user, navigate]);

  // Welcome message on mount
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `Hello ${user?.name?.split(" ")[0] || "there"}! 👋 I'm your AI Loan Advisor.\n\nI've analysed your financial profile and I'm ready to help you understand your loan options, compare EMIs, and answer any questions. You can also attach a salary slip image or bank statement PDF for deeper analysis.\n\nWhat would you like to know?`,
        timestamp: new Date(),
      },
    ]);
  }, [user?.name]);

  /**
   * Handle file selection — validate type, convert to raw base64
   */
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isPDF = file.type === ALLOWED_PDF_TYPE;

    if (!isImage && !isPDF) {
      toast.error("Only images (JPEG, PNG, GIF, WebP) or PDF files are supported");
      return;
    }

    // 5 MB limit to keep base64 payload reasonable
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5 MB");
      return;
    }

    try {
      const base64 = await fileToBase64(file); // raw base64, no prefix
      setAttachedFile({
        file,
        base64,
        type: isPDF ? "pdf" : "image",
        mediaType: isImage ? file.type : null, // only needed for images
        name: file.name,
      });
      toast.success(`${file.name} attached`);
    } catch {
      toast.error("Failed to read file");
    }

    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const removeAttachment = () => setAttachedFile(null);

  /**
   * Send message — dispatches correct payload based on attachment type:
   *   text only       → { message, sessionId }
   *   image attached  → { message, sessionId, imageBase64, imageMediaType }
   *   PDF attached    → { message, sessionId, pdfBase64 }
   */
  const sendMessage = async (text) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    setInput("");

    // Snapshot and clear attachment before async work
    const currentAttachment = attachedFile;
    setAttachedFile(null);

    const userMsg = {
      role: "user",
      content: messageText,
      timestamp: new Date(),
      attachment: currentAttachment
        ? { type: currentAttachment.type, name: currentAttachment.name }
        : null,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      let res;
      if (currentAttachment?.type === "image") {
        // LLM wrapper method 2a: prompt + imageBase64 + imageMediaType
        res = await chatService.sendMessage(messageText, sessionId, {
          imageBase64: currentAttachment.base64,
          imageMediaType: currentAttachment.mediaType,
        });
      } else if (currentAttachment?.type === "pdf") {
        // LLM wrapper method 2b: prompt + pdfBase64
        res = await chatService.sendMessage(messageText, sessionId, {
          pdfBase64: currentAttachment.base64,
        });
      } else {
        // LLM wrapper method 1/3: prompt + metadata (standard text)
        res = await chatService.sendMessage(messageText, sessionId);
      }

      setSessionId(res.data.sessionId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.assistantMessage,
          timestamp: new Date(res.data.timestamp),
        },
      ]);
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || "Failed to get response. Please try again.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I encountered an error: ${errorMsg}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-t-xl px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl">🤖</div>
        <div>
          <h1 className="font-semibold text-gray-900">AI Loan Advisor</h1>
          <p className="text-xs text-emerald-600">● Grounded on your profile & product catalog</p>
        </div>
        {sessionId && (
          <span className="ml-auto text-xs text-gray-400">Session active</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 bg-gray-50 border-x border-gray-200 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm mr-2 flex-shrink-0">
              🤖
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      <div className="bg-white border-x border-gray-200 px-4 py-2 flex gap-2 overflow-x-auto">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => sendMessage(p)}
            disabled={loading}
            className="flex-shrink-0 text-xs px-3 py-1.5 border border-gray-300 rounded-full hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Attachment preview bar */}
      {attachedFile && (
        <div className="bg-blue-50 border-x border-blue-200 px-4 py-2 flex items-center gap-2">
          <span className="text-sm">{attachedFile.type === "pdf" ? "📄" : "🖼️"}</span>
          <span className="text-xs text-blue-800 font-medium truncate flex-1">{attachedFile.name}</span>
          <span className="text-xs text-blue-500 capitalize">{attachedFile.type}</span>
          <button
            onClick={removeAttachment}
            className="text-xs text-red-500 hover:text-red-700 ml-2 font-medium"
          >
            ✕ Remove
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="bg-white border border-gray-200 rounded-b-xl px-4 py-3 flex gap-2 items-end">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          title="Attach image or PDF (salary slip, bank statement)"
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40 flex-shrink-0"
        >
          📎
        </button>

        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Ask about your loan options, EMI, tenure trade-offs…"
          rows={2}
          className="flex-1 resize-none text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
        />

        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors flex-shrink-0 text-sm"
        >
          Send →
        </button>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs text-gray-400 mt-2 pb-1">
        ⚠️ AI responses are informational only. Not financial advice.
      </p>
    </div>
  );
};

export default ChatPage;