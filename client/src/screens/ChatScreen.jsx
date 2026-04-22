import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MdSend } from "react-icons/md";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchChatSuggestions, sendChatMessage } from "../services/api";

export default function ChatScreen() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const endRef = useRef(null);

  const { data: suggestions = [] } = useQuery({
    queryKey: ["chat-suggestions"],
    queryFn: fetchChatSuggestions,
  });

  const mutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (reply) => {
      setMessages((prev) => [...prev, { role: "bot", text: reply }]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Sorry, I could not process your request right now. Please try again.",
        },
      ]);
    },
  });

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, mutation.isPending]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !mutation.isPending,
    [input, mutation.isPending],
  );

  function handleSend(messageText) {
    const text = messageText.trim();
    if (!text) return;
    const history = messages.slice(-8);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    mutation.mutate({ message: text, history });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100dvh - 130px)",
      }}
    >
      <div style={{ flex: 1, overflowY: "auto" }}>
        {messages.length === 0 ? (
          <div style={{ padding: 12 }}>
            <div
              className="card-elevated"
              style={{ textAlign: "center", paddingTop: 24, paddingBottom: 24 }}
            >
              <div className="text-xxl" style={{ fontWeight: 700 }}>
                Hello, Farmer!
              </div>
              <div className="text-md muted mt-8">
                I am your AI farming assistant. Ask anything about crops,
                disease, irrigation, and market planning.
              </div>
            </div>

            <div
              className="text-sm"
              style={{ fontWeight: 700, marginTop: 16, marginBottom: 8 }}
            >
              Try asking:
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {suggestions.map((question) => (
                <button
                  key={question}
                  className="card"
                  style={{ textAlign: "left", cursor: "pointer" }}
                  onClick={() => handleSend(question)}
                >
                  <div className="text-sm" style={{ color: "#1b5e20" }}>
                    {question}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="message-list">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`message ${message.role === "user" ? "user" : "bot"}`}
              >
                {message.role === "user" ? (
                  message.text
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ node, ...props }) => (
                        <div style={{ overflowX: "auto", margin: "12px 0", borderRadius: "8px", border: "1px solid #e0e0e0" }}>
                          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "14px" }} {...props} />
                        </div>
                      ),
                      th: ({ node, ...props }) => (
                        <th style={{ borderBottom: "2px solid #2E7D32", padding: "12px", textAlign: "left", backgroundColor: "#f1f8e9", color: "#1b5e20", fontWeight: 700 }} {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td style={{ borderBottom: "1px solid #e0e0e0", padding: "12px", verticalAlign: "top" }} {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p style={{ margin: "8px 0", lineHeight: "1.5" }} {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul style={{ paddingLeft: "20px", margin: "8px 0" }} {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol style={{ paddingLeft: "20px", margin: "8px 0" }} {...props} />
                      ),
                    }}
                  >
                    {message.text}
                  </ReactMarkdown>
                )}
              </div>
            ))}
            {mutation.isPending && (
              <div className="message bot">Thinking...</div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div
        className="card"
        style={{
          position: "sticky",
          bottom: 0,
          background: "#ffffff",
          borderRadius: 16,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <input
          className="search-input"
          style={{ flex: 1 }}
          placeholder="Ask about farming, crops, diseases..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSend(input);
            }
          }}
        />
        <button
          className="btn btn-primary"
          disabled={!canSend}
          onClick={() => handleSend(input)}
          aria-label="Send message"
        >
          <MdSend size={18} />
        </button>
      </div>
    </div>
  );
}
