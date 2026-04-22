import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MdSend } from "react-icons/md";
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

  const canSend = useMemo(() => input.trim().length > 0 && !mutation.isPending, [input, mutation.isPending]);

  function handleSend(messageText) {
    const text = messageText.trim();
    if (!text) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    mutation.mutate(text);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100dvh - 130px)" }}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {messages.length === 0 ? (
          <div style={{ padding: 12 }}>
            <div className="card-elevated" style={{ textAlign: "center", paddingTop: 24, paddingBottom: 24 }}>
              <div className="text-xxl" style={{ fontWeight: 700 }}>Hello, Farmer!</div>
              <div className="text-md muted mt-8">I am your AI farming assistant. Ask anything about crops, disease, irrigation, and market planning.</div>
            </div>

            <div className="text-sm" style={{ fontWeight: 700, marginTop: 16, marginBottom: 8 }}>Try asking:</div>
            <div style={{ display: "grid", gap: 8 }}>
              {suggestions.map((question) => (
                <button key={question} className="card" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => handleSend(question)}>
                  <div className="text-sm" style={{ color: "#1b5e20" }}>{question}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="message-list">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`message ${message.role === "user" ? "user" : "bot"}`}>
                {message.text}
              </div>
            ))}
            {mutation.isPending && <div className="message bot">Thinking...</div>}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="card" style={{ position: "sticky", bottom: 0, background: "#ffffff", borderRadius: 16, display: "flex", gap: 8, alignItems: "center" }}>
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
        <button className="btn btn-primary" disabled={!canSend} onClick={() => handleSend(input)} aria-label="Send message">
          <MdSend size={18} />
        </button>
      </div>
    </div>
  );
}
