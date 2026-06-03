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
        {msg.content.split("\n").map((line, i) => (
          <p key={i} className={i > 0 ? "mt-1" : ""}>{line}</p>
        ))}
        <p className={`text-xs mt-1 ${isUser ? "text-blue-200" : "text-gray-400"}`}>
          {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check loan profile exists
  useEffect(() => {
    if (!user?.loanProfile?.loanAmount) {
      toast.error("Please complete your loan profile first");
      navigate("/loan-form");
    }
  }, [user, navigate]);

  // Welcome message
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `Hello ${user?.name?.split(" ")[0] || "there"}! 👋 I'm your AI Loan Advisor. I've analyzed your financial profile and I'm ready to help you understand your loan options, compare EMIs, and answer any questions.\n\nWhat would you like to know?`,
        timestamp: new Date(),
      },
    ]);
  }, [user?.name]);

  const sendMessage = async (text) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    setInput("");
    const userMsg = { role: "user", content: messageText, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await chatService.sendMessage(messageText, sessionId);
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
      const errorMsg = err.response?.data?.error || "Failed to get response. Please try again.";
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

        {loading && (
          <div className="flex justify-start mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm mr-2">🤖</div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
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

      {/* Input */}
      <div className="bg-white border border-gray-200 rounded-b-xl px-4 py-3 flex gap-3">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Ask about your loan options, EMI, tenure trade-offs..."
          rows={2}
          className="flex-1 resize-none text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors self-end text-sm"
        >
          Send →
        </button>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs text-gray-400 mt-2">
        ⚠️ AI responses are informational only. Not financial advice.
      </p>
    </div>
  );
};

export default ChatPage;